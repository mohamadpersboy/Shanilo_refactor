import type { PaymentProviderId } from "./ids";
import type {
  PaymentCreationResult,
  PaymentRequest,
  PaymentVerificationRequest,
  PaymentVerificationResult,
} from "./values";

/**
 * Contract between a future PaymentService and a gateway Adapter (MellatProvider, ZarinPalProvider).
 *
 *   PaymentService → PaymentProvider → Adapter (conversion, SOAP/REST, gateway codes)
 *
 * The PaymentService never knows SOAP, REST, Authority, RefId, SaleOrderId or SaleReferenceId.
 * A provider is a gateway integration ONLY. It must not:
 *  - update an Order or a Payment record, or touch a Wallet or Credit,
 *  - store idempotency state (the Service does, with the `operationId` it passes),
 *  - redirect a browser or build an HTTP response,
 *  - expose a raw gateway response.
 * Failures are thrown as `PaymentError` subclasses. Gateway codes stay in `internalDetail`.
 * Refund and settlement are NOT part of this interface (later contracts). Inquiry is deferred:
 * it can be added later as a separate interface without changing this one.
 */
export interface PaymentProvider {
  readonly id: PaymentProviderId;

  /**
   * Create the payment at the gateway and return where to send the customer.
   * Converts `request.amount` (TOMAN) to the gateway unit inside the Adapter.
   */
  createPayment(request: PaymentRequest): Promise<PaymentCreationResult>;

  /**
   * Ask the gateway for the final state of a payment. This is the ONLY way to learn that a payment
   * succeeded. A callback alone is never proof. The Adapter compares the gateway amount with
   * `request.expectedAmount` and returns the verified amount as `Money` (TOMAN).
   */
  verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResult>;
}
