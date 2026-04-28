package com.tailorstudio.app.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.bson.types.ObjectId;

import java.time.Instant;

@Document(collection = "users")
public class User {

    @Id
    private Long id;

    private String mongoObjectId = new ObjectId().toHexString();

    @Indexed(unique = true)
    private String email;

    private String passwordHash;

    private String fullName;

    private UserRole role;

    private Long businessId;

    @Transient
    private Business business;

    private boolean enabled = true;

    private Instant createdAt = Instant.now();

    private String inviteNote;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getMongoObjectId() {
        return mongoObjectId;
    }

    public void setMongoObjectId(String mongoObjectId) {
        this.mongoObjectId = mongoObjectId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public Business getBusiness() {
        return business;
    }

    public void setBusiness(Business business) {
        this.business = business;
        this.businessId = business != null ? business.getId() : null;
    }

    public Long getBusinessId() {
        return businessId;
    }

    public void setBusinessId(Long businessId) {
        this.businessId = businessId;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getInviteNote() {
        return inviteNote;
    }

    public void setInviteNote(String inviteNote) {
        this.inviteNote = inviteNote;
    }
}
