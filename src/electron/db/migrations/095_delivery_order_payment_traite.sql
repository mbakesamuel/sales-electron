-- Traite payment details on delivery order payments (parity with Sale.Payment).

ALTER TABLE DeliveryOrderPaymentDetails ADD COLUMN traiteNo TEXT;
ALTER TABLE DeliveryOrderPaymentDetails ADD COLUMN traiteIssuedOn TEXT;
ALTER TABLE DeliveryOrderPaymentDetails ADD COLUMN traiteMaturityOn TEXT;
