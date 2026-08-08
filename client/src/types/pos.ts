// Cart & Order types for frontend state management

export type SalesChannel = "walkin" | "grab";
export type PaymentMethod = "cash" | "transfer";

export interface CartModifier {
  modifierOptionId: number;
  modifierGroupName: string;
  modifierName: string;
  priceAdd: number;
}

export interface CartItem {
  cartId: string; // unique per cart line
  itemId: number;
  variantId: number;
  itemName: string;
  variantName: string;
  quantity: number;
  basePrice: number;
  modifiersPrice: number;
  totalPrice: number;
  modifiers: CartModifier[];
}

