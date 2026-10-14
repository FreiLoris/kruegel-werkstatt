-- Suppliers (FB-09). Customers and vehicles come from SwissGarage, suppliers do not – kept here.
CREATE TABLE supplier (
    id               uuid         PRIMARY KEY,
    version          bigint       NOT NULL,
    created_at       timestamptz  NOT NULL,
    updated_at       timestamptz  NOT NULL,
    created_by       uuid         REFERENCES employee (id),
    updated_by       uuid         REFERENCES employee (id),

    name             text         NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
    contact_person   text         CHECK (length(contact_person) <= 100),
    phone            text         CHECK (length(phone) <= 40),
    email            text         CHECK (length(email) <= 100),
    -- only http(s) – the page shows it as a link
    webshop_url      text         CHECK (length(webshop_url) <= 300 AND webshop_url ~* '^https?://'),
    -- our customer number with the supplier
    customer_number  text         CHECK (length(customer_number) <= 60),
    order_channel    text         CHECK (order_channel IN ('WEBSHOP', 'PHONE', 'EMAIL')),
    -- delivery times or rounds, e.g. "2× täglich"
    delivery         text         CHECK (length(delivery) <= 100),
    remark           text         CHECK (length(remark) <= 1000)
);

CREATE UNIQUE INDEX supplier_name_unique ON supplier (lower(trim(name)));

-- Who sells an article, with the supplier's own article number. Position 0 = main supplier,
-- further ones optional (FB-09). Each supplier once per article – checked by the app: a unique index
-- would get in the way when Hibernate rewrites the positions. A deleted supplier is taken off its
-- articles by the app (positions close up); the cascade is only the safety net.
CREATE TABLE stock_item_supplier (
    stock_item_id    uuid     NOT NULL REFERENCES stock_item (id) ON DELETE CASCADE,
    position         integer  NOT NULL CHECK (position >= 0),
    supplier_id      uuid     NOT NULL REFERENCES supplier (id) ON DELETE CASCADE,
    article_number   text     CHECK (length(article_number) <= 60),

    PRIMARY KEY (stock_item_id, position)
);

CREATE INDEX stock_item_supplier_supplier ON stock_item_supplier (supplier_id);
