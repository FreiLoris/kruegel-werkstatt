package ch.kruegel.workshop.screenlock;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

/** After how many minutes without use a device asks again who is at it (FB-29) – exactly one row (V51). */
@Entity
public class ScreenLockSettings extends BaseEntity {

    static final int MAX_MINUTES = 120;

    /** 0 = never */
    @Column(nullable = false)
    private int lockMinutes;

    protected ScreenLockSettings() {
        // for JPA
    }

    public void update(int lockMinutes) {
        if (lockMinutes < 0 || lockMinutes > MAX_MINUTES) {
            throw new IllegalArgumentException("Lock minutes out of range: " + lockMinutes);
        }
        this.lockMinutes = lockMinutes;
    }

    public int getLockMinutes() {
        return lockMinutes;
    }
}
