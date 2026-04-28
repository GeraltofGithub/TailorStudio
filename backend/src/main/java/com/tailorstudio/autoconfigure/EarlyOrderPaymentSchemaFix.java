package com.tailorstudio.autoconfigure;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.context.annotation.Bean;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Runs before Hibernate builds the {@code EntityManagerFactory} so missing payment columns
 * are added on existing H2 databases (Hibernate's {@code update} can fail on NOT NULL adds).
 */
@AutoConfiguration(before = HibernateJpaAutoConfiguration.class)
public class EarlyOrderPaymentSchemaFix {

    private static final Logger log = LoggerFactory.getLogger(EarlyOrderPaymentSchemaFix.class);

    /** Marker bean so the schema fix runs exactly once during startup. */
    public static final class OrderPaymentSchemaMarker {}

    @Bean
    @ConditionalOnBean(DataSource.class)
    public OrderPaymentSchemaMarker orderPaymentSchemaApplied(DataSource dataSource) {
        try (Connection c = dataSource.getConnection();
                Statement st = c.createStatement()) {
            st.execute(
                    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_in_full_at TIMESTAMP(9) WITH TIME ZONE");
            st.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_payment_method VARCHAR(32)");
            st.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone_pe_merchant_order_id VARCHAR(64)");
            st.execute("UPDATE orders SET last_payment_method = 'NONE' WHERE last_payment_method IS NULL");
        } catch (SQLException e) {
            if (e.getMessage() != null && e.getMessage().contains("not found")) {
                log.debug("Skipping payment column fix (no orders table yet): {}", e.getMessage());
            } else {
                log.warn("Could not apply early payment column fix: {}", e.getMessage());
            }
        }
        return new OrderPaymentSchemaMarker();
    }
}
