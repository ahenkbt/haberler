import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// cjs paket
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Iyzipay = require("iyzipay") as {
  LOCALE: { TR: string };
  CURRENCY: { TRY: string };
  PAYMENT_GROUP: { PRODUCT: string };
  BASKET_ITEM_TYPE: { PHYSICAL: string; VIRTUAL: string };
  new (c: { apiKey: string; secretKey: string; uri: string }): {
    checkoutFormInitialize: { create: (r: unknown, cb: (e: unknown, r: unknown) => void) => void };
    checkoutForm: { retrieve: (r: unknown, cb: (e: unknown, r: unknown) => void) => void };
  };
};

export function createIyzipayClient(apiKey: string, secretKey: string, sandbox: boolean) {
  return new Iyzipay({
    apiKey,
    secretKey,
    uri: sandbox ? "https://sandbox-api.iyzipay.com" : "https://api.iyzipay.com",
  });
}

export type IyzicoCheckoutInitInput = {
  apiKey: string;
  secretKey: string;
  sandbox: boolean;
  conversationId: string;
  priceTry: string;
  paidPriceTry: string;
  basketId: string;
  callbackUrl: string;
  buyer: {
    id: string;
    name: string;
    surname: string;
    gsmNumber: string;
    email: string;
    identityNumber: string;
    registrationAddress: string;
    ip: string;
    city: string;
    country: string;
    zipCode: string;
  };
  shippingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
    zipCode: string;
  };
  billingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
    zipCode: string;
  };
  basketItems: Array<{
    id: string;
    name: string;
    category1: string;
    itemType: string;
    price: string;
  }>;
};

function iyziPromise<T>(
  fn: (cb: (err: unknown, result: T) => void) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    fn((err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

export async function iyzicoCheckoutFormInitialize(
  input: IyzicoCheckoutInitInput,
): Promise<{ checkoutFormContent: string; token: string } | { error: string; raw?: string }> {
  const iyzipay = createIyzipayClient(input.apiKey, input.secretKey, input.sandbox);
  const request = {
    locale: Iyzipay.LOCALE.TR,
    conversationId: input.conversationId,
    price: input.priceTry,
    paidPrice: input.paidPriceTry,
    currency: Iyzipay.CURRENCY.TRY,
    basketId: input.basketId,
    paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
    callbackUrl: input.callbackUrl,
    enabledInstallments: [1, 2, 3, 6, 9],
    buyer: input.buyer,
    shippingAddress: input.shippingAddress,
    billingAddress: input.billingAddress,
    basketItems: input.basketItems,
  };
  try {
    const result = await iyziPromise<{
      status: string;
      errorMessage?: string;
      checkoutFormContent?: string;
      token?: string;
    }>((cb) => iyzipay.checkoutFormInitialize.create(request, cb));
    if (result.status === "success" && result.checkoutFormContent && result.token) {
      return { checkoutFormContent: result.checkoutFormContent, token: result.token };
    }
    return { error: result.errorMessage || "iyzico başlatılamadı", raw: JSON.stringify(result) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "iyzico hatası" };
  }
}

export async function iyzicoCheckoutFormRetrieve(
  apiKey: string,
  secretKey: string,
  sandbox: boolean,
  conversationId: string,
  token: string,
): Promise<{ paymentStatus?: string; conversationId?: string } | { error: string }> {
  const iyzipay = createIyzipayClient(apiKey, secretKey, sandbox);
  try {
    const result = await iyziPromise<{
      status: string;
      errorMessage?: string;
      paymentStatus?: string;
      conversationId?: string;
    }>((cb) =>
      iyzipay.checkoutForm.retrieve({ locale: Iyzipay.LOCALE.TR, conversationId, token }, cb),
    );
    if (result.status === "success") {
      return { paymentStatus: result.paymentStatus, conversationId: result.conversationId };
    }
    return { error: result.errorMessage || "iyzico sonuç okunamadı" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "iyzico retrieve hatası" };
  }
}
