package com.tailorstudio.app.repo;

import com.tailorstudio.app.domain.OrderStatus;
import com.tailorstudio.app.domain.TailorOrder;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TailorOrderRepository extends JpaRepository<TailorOrder, Long> {

    long countByBusiness_Id(Long businessId);

    @EntityGraph(attributePaths = {"customer", "lines"})
    @Query("SELECT o FROM TailorOrder o WHERE o.business.id = :bid ORDER BY o.createdAt DESC")
    List<TailorOrder> findAllWithDetailsForBusiness(@Param("bid") Long businessId);

    List<TailorOrder> findByBusiness_IdOrderByCreatedAtDesc(Long businessId);

    @EntityGraph(attributePaths = {"customer", "lines"})
    List<TailorOrder> findByBusiness_IdAndCustomer_IdOrderByCreatedAtDesc(Long businessId, Long customerId);

    List<TailorOrder> findByBusiness_IdAndStatusOrderByDeliveryDateAsc(Long businessId, OrderStatus status);

    @Query("SELECT COALESCE(MAX(o.serialNumber), 0) FROM TailorOrder o WHERE o.business.id = :bid")
    long maxSerialNumber(@Param("bid") Long businessId);

    @EntityGraph(attributePaths = {"customer", "lines", "business"})
    Optional<TailorOrder> findByIdAndBusiness_Id(Long id, Long businessId);

    @Query("SELECT COUNT(o) FROM TailorOrder o WHERE o.business.id = :bid AND o.status <> :delivered")
    long countActiveOrders(@Param("bid") Long businessId, @Param("delivered") OrderStatus delivered);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM TailorOrder o WHERE o.business.id = :bid AND o.status = :delivered AND o.deliveredAt >= :start AND o.deliveredAt < :end")
    BigDecimal sumDeliveredIncomeBetween(
            @Param("bid") Long businessId,
            @Param("delivered") OrderStatus delivered,
            @Param("start") Instant start,
            @Param("end") Instant end);

    @Query("SELECT o FROM TailorOrder o WHERE o.business.id = :bid AND o.deliveryDate BETWEEN :from AND :to AND o.status <> :delivered")
    List<TailorOrder> findDueSoon(
            @Param("bid") Long businessId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("delivered") OrderStatus delivered);

    @Query("SELECT o FROM TailorOrder o JOIN FETCH o.customer JOIN FETCH o.business WHERE o.deliveryDate = :d AND o.status <> :s")
    List<TailorOrder> findByDeliveryDateAndStatusNotWithDetails(
            @Param("d") LocalDate deliveryDate, @Param("s") OrderStatus status);

    @Query("SELECT o FROM TailorOrder o JOIN FETCH o.customer JOIN FETCH o.business WHERE o.deliveryDate BETWEEN :from AND :to AND o.status <> :s")
    List<TailorOrder> findDueBetweenWithDetails(
            @Param("from") LocalDate from, @Param("to") LocalDate to, @Param("s") OrderStatus status);
}
