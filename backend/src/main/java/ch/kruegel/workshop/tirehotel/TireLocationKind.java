package ch.kruegel.workshop.tirehotel;

/**
 * How a location of the tyre hotel is built – and so how its places are addressed.
 * FLOOR: a grid on the floor, a few sets per field (tyre trolleys) → "OG-B3-1".
 * SHELVES: shelves with levels and compartments → "CT-R1-E2-F4".
 */
public enum TireLocationKind {
    FLOOR,
    SHELVES
}
