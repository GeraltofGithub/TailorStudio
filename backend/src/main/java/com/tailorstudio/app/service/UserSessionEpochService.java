package com.tailorstudio.app.service;

import com.tailorstudio.app.domain.User;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

@Service
public class UserSessionEpochService {

    private final MongoTemplate mongoTemplate;

    public UserSessionEpochService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    /** Atomically increments session epoch and returns the new value (first login → 1). */
    public long bumpEpoch(long userId) {
        Query q = Query.query(Criteria.where("_id").is(userId));
        Update u = new Update().inc("sessionEpoch", 1);
        FindAndModifyOptions opts = FindAndModifyOptions.options().returnNew(true);
        User updated = mongoTemplate.findAndModify(q, u, opts, User.class);
        if (updated == null) {
            throw new IllegalStateException("User not found for session epoch bump: " + userId);
        }
        Long e = updated.getSessionEpoch();
        return e == null ? 1L : e;
    }
}
