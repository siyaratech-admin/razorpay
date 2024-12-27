import { Suspense } from 'react'
import { LoaderCircle } from 'lucide-react'
import { CheckoutForm } from './checkout-form'

export default function CheckoutPage() {
  return (
    <Suspense 
      fallback={
        <div className="container h-screen flex justify-center items-center">
          <LoaderCircle className="animate-spin h-20 w-20 text-primary" />
        </div>
      }
    >
      <CheckoutForm />
    </Suspense>
  )
}

