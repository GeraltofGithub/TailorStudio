package com.tailorstudio.app.repo;

import com.tailorstudio.app.domain.Customer;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.regex.Pattern;

@Repository
public class CustomerRepositoryImpl implements CustomerRepositoryCustom {

    private final MongoTemplate mongo;

    public CustomerRepositoryImpl(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    @Override
    public List<Customer> search(Long businessId, String q) {
        String raw = q == null ? "" : q.trim();
        if (raw.isEmpty()) {
            Query all = new Query(Criteria.where("businessId").is(businessId));
            all.with(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "name"));
            return mongo.find(all, Customer.class);
        }

        Pattern nameLike = Pattern.compile(Pattern.quote(raw), Pattern.CASE_INSENSITIVE);
        Criteria base = Criteria.where("businessId").is(businessId);
        Criteria match = new Criteria().orOperator(
                Criteria.where("name").regex(nameLike),
                Criteria.where("phone").regex(Pattern.compile(Pattern.quote(raw)))
        );
        Query query = new Query(new Criteria().andOperator(base, match));
        query.with(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "name"));
        return mongo.find(query, Customer.class);
    }

    @Override
    public List<Customer> searchActive(Long businessId, String q) {
        String raw = q == null ? "" : q.trim();
        Criteria active = Criteria.where("active").ne(false); // include null as active
        if (raw.isEmpty()) {
            Query all = new Query(new Criteria().andOperator(Criteria.where("businessId").is(businessId), active));
            all.with(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "name"));
            return mongo.find(all, Customer.class);
        }

        Pattern nameLike = Pattern.compile(Pattern.quote(raw), Pattern.CASE_INSENSITIVE);
        Criteria base = Criteria.where("businessId").is(businessId);
        Criteria match = new Criteria().orOperator(
                Criteria.where("name").regex(nameLike),
                Criteria.where("phone").regex(Pattern.compile(Pattern.quote(raw)))
        );
        Query query = new Query(new Criteria().andOperator(base, active, match));
        query.with(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "name"));
        return mongo.find(query, Customer.class);
    }

    @Override
    public List<Customer> findCardsByBusinessAndIds(Long businessId, Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        Query q = new Query(new Criteria().andOperator(Criteria.where("businessId").is(businessId), Criteria.where("_id").in(ids)));
        q.with(Sort.by(Sort.Direction.ASC, "name"));
        q.fields()
                .include("_id")
                .include("mongoObjectId")
                .include("businessId")
                .include("name")
                .include("phone")
                .include("active");
        return mongo.find(q, Customer.class);
    }
}

