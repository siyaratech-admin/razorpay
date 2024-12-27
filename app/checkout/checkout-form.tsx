"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { LoaderCircle } from 'lucide-react';
import axios from "axios";

export function CheckoutForm() {
  const router = useRouter();
  const params = useSearchParams();
  const amount = params.get("amount");
  const currency = params.get("currency") || "INR";
  const siyaratechOrderId = params.get("orderId");
  const userId = params.get("userId");
  const [loading, setLoading] = React.useState(true);
  const [razorpayOrderId, setRazorpayOrderId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!amount || !siyaratechOrderId || !userId) {
      router.replace("/");
    } else {
      createRazorpayOrder();
    }
  }, [amount, siyaratechOrderId, userId, router]);

  const createRazorpayOrder = async () => {
    try {
      console.log("Creating Razorpay order...");
      const response = await axios.post("api/order", {
          amount: parseFloat(amount!),
          currency,
          siyaratechOrderId,
          userId,
        }, 
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response) {
        throw new Error("Network response was not ok");
      }

      const data = await response.data;
      setRazorpayOrderId(data.orderId);
      setLoading(false);
    } catch (error) {
      console.error("There was a problem with your fetch operation:", error);
      setLoading(false);
    }
  };

  const processPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (!razorpayOrderId) {
      console.error("Razorpay order ID is not available");
      setLoading(false);
      return;
    }

    try {
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: parseFloat(amount!),
        currency: currency,
        name: "Siyaratech Payment",
        description: "Course Payment",
        order_id: razorpayOrderId,
        handler: async function (response: any) {
          const data = {
            orderCreationId: razorpayOrderId,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
          };

          const result = await fetch("/api/verify", {
            method: "POST",
            body: JSON.stringify(data),
            headers: { "Content-Type": "application/json" },
          });
          const res = await result.json();
          if (res.isOk) {
            alert(res.message);
            try {
                await axios.post(
                  `${process.env.NEXT_PUBLIC_COURSE_PLATFORM_URL}/api/callback`,
                  {
                    orderId: siyaratechOrderId,
                    status: 'COMPLETED',
                    data: {},
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${process.env.NEXT_PUBLIC_AUTH_TOKEN}`, 
                    },
                  }
                );
                router.push(`${process.env.NEXT_PUBLIC_SIYARATECH_URL}/payment-success?orderId=${siyaratechOrderId}`);
              } catch (error) {
                console.error('Failed to notify course-platform:', error);
              }
              
          } else {
            alert(res.message);
          }
        },
        theme: {
          color: "#3399cc",
        },
      };
      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.on("payment.failed", function (response: any) {
        alert(response.error.description);
      });
      setLoading(false);
      paymentObject.open();
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container h-screen flex justify-center items-center">
        <LoaderCircle className="animate-spin h-20 w-20 text-primary" />
      </div>
    );
  }

  return (
    <>
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
      />

      <section className="container h-screen flex flex-col justify-center items-center gap-10">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight">
          Checkout
        </h1>
        <Card className="max-w-[25rem] space-y-8">
          <CardHeader>
            <CardTitle className="my-4">Continue</CardTitle>
            <CardDescription>
              By clicking on pay you&apos;ll purchase your plan subscription of{" "}
              {formatPrice(parseFloat(amount!), currency)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={processPayment}>
              <Button className="w-full" type="submit">
                {loading ? "...loading" : "Pay"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex">
            <p className="text-sm text-muted-foreground underline underline-offset-4">
              Please read the terms and conditions.
            </p>
          </CardFooter>
        </Card>
      </section>
    </>
  );
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

