import React, { useState, useEffect } from 'react';
import ProductSection from "@/components/product-section";
import CartSection from "@/components/cart-section";
// import ShiftVerification from '@/components/shift-verification';

export default function POSPage() {
  return (
    <>
      {/* <ShiftVerification /> */}
      <ProductSection />
      <CartSection />
    </>
  );
}
