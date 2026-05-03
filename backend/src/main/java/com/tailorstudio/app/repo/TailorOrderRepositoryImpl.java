package com.tailorstudio.app.repo;

import com.tailorstudio.app.domain.OrderStatus;
import com.tailorstudio.app.domain.TailorOrder;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Repository
public class TailorOrderRepositoryImpl implements TailorOrderRepositoryCustom {

    private final MongoTemplate mongo;

    public TailorOrderRepositoryImpl(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    @Override
    public long countActiveOrders(Long businessId, OrderStatus delivered) {
        Criteria c = Criteria.where("businessId").is(businessId).and("status").ne(delivered);
        return mongo.count(org.springframework.data.mongodb.core.query.Query.query(c), TailorOrder.class);
    }

    @Override
    public BigDecimal sumDeliveredIncomeBetween(Long businessId, OrderStatus delivered, Instant start, Instant end) {
        Criteria c = Criteria.where("businessId").is(businessId)
                .and("status").is(delivered)
                .and("deliveredAt").gte(start).lt(end);

        Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(c),
                Aggregation.group().sum("totalAmount").as("sum")
        );
        AggregationResults<SumOut> out = mongo.aggregate(agg, "orders", SumOut.class);
        SumOut s = out.getUniqueMappedResult();
        if (s == null || s.sum == null) return BigDecimal.ZERO;
        return s.sum;
    }

    @Override
    public List<TailorOrder> findDueBetweenWithDetails(LocalDate from, LocalDate to, OrderStatus delivered) {
        Criteria c = Criteria.where("deliveryDate").gte(from).lte(to).and("status").ne(delivered);
        return mongo.find(Query.query(c), TailorOrder.class, "orders");
    }

    @Override
    public List<TailorOrder> findListRowsByBusinessId(Long businessId) {
        Query q = new Query(Criteria.where("businessId").is(businessId));
        q.with(Sort.by(Sort.Direction.DESC, "createdAt"));
        applyOrderListProjection(q.fields());
        return mongo.find(q, TailorOrder.class, "orders");
    }

    @Override
    public List<TailorOrder> findHistoryRowsByBusinessIdAndCustomerId(Long businessId, Long customerId) {
        Query q = new Query(new Criteria().andOperator(
                Criteria.where("businessId").is(businessId),
                Criteria.where("customerId").is(customerId)));
        q.with(Sort.by(Sort.Direction.DESC, "createdAt"));
        applyOrderListProjection(q.fields());
        return mongo.find(q, TailorOrder.class, "orders");
    }

    private static void applyOrderListProjection(org.springframework.data.mongodb.core.query.Field fields) {
        fields.include("_id")
                .include("mongoObjectId")
                .include("businessId")
                .include("serialNumber")
                .include("customerId")
                .include("garmentType")
                .include("orderDate")
                .include("deliveryDate")
                .include("status")
                .include("totalAmount")
                .include("advanceAmount")
                .include("createdAt");
    }

    private static class SumOut {
        public BigDecimal sum;
    }
}

