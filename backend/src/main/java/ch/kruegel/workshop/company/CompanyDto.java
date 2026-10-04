package ch.kruegel.workshop.company;

import io.swagger.v3.oas.annotations.media.Schema;

/** Company profile as delivered by the API. */
public record CompanyDto(
        long version,
        String name,
        @Schema(types = {"string", "null"}) String street,
        @Schema(types = {"string", "null"}) String postalCode,
        @Schema(types = {"string", "null"}) String city,
        @Schema(types = {"string", "null"}) String phone,
        @Schema(types = {"string", "null"}) String email,
        @Schema(types = {"string", "null"}) String website,
        @Schema(types = {"string", "null"}, example = "/api/company/logo?v=1791200000000",
                description = "Address of the logo – changes with every upload (caches); empty without logo") String logoUrl) {

    static CompanyDto of(CompanyProfile profile, CompanyLogoStore.LogoInfo logo) {
        CompanyDetails d = profile.getDetails();
        String logoUrl = logo == null ? null : "/api/company/logo?v=" + logo.updatedAt().toEpochMilli();
        return new CompanyDto(profile.getVersion(), d.name(), d.street(), d.postalCode(), d.city(), d.phone(), d.email(),
                d.website(), logoUrl);
    }
}
