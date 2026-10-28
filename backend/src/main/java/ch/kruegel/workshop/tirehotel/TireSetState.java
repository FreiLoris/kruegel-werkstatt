package ch.kruegel.workshop.tirehotel;

/** Where a set is (FB-12) – in the hotel, on the car, or with the customer. */
public enum TireSetState {
    /** im Pneuhotel – with its place */
    IN_HOTEL,
    /** montiert – on the car */
    MOUNTED,
    /** beim Kunden – taken home, brought next time */
    WITH_CUSTOMER,
    /** entsorgt – worn out, replaced by new tyres (FB-25); kept with its history */
    DISPOSED
}
