package com.tailorstudio.app.mongo;

import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoOperations;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

@Service
public class SequenceService {

    private final MongoOperations mongo;

    public SequenceService(MongoOperations mongo) {
        this.mongo = mongo;
    }

    public long next(String key) {
        Query q = new Query(Criteria.where("_id").is(key));
        Update u = new Update().inc("seq", 1);
        FindAndModifyOptions opts = FindAndModifyOptions.options().upsert(true).returnNew(true);
        MongoSequence seq = mongo.findAndModify(q, u, opts, MongoSequence.class);
        if (seq == null) {
            // extremely rare; fallback
            MongoSequence created = new MongoSequence(key, 1);
            mongo.save(created);
            return 1;
        }
        return seq.getSeq();
    }
}

