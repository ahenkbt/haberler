<?php

namespace App\Http\Requests\Checkout;

use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules(): array
    {
        $ruleArray = [
            'first_name' => 'required',
            'last_name' => 'required',
            'company_name' => 'required',
            'username' => 'required',
            'password' => 'required',
            'email' => 'required|email',
            'phone' => 'required',
            'country' => 'required',
            'price' => 'required',
            'payment_method' => $this->price != 0 ? 'required' : '',
            'receipt' => $this->is_receipt == 1 ? 'required | mimes:jpeg,jpg,png' : '',
            'cardNumber' => 'sometimes|required',
            'month' => 'sometimes|required',
            'year' => 'sometimes|required',
            'cardCVC' => 'sometimes|required',
            'identity_number' => $this->payment_method == 'Iyzico' ? 'required' : '',
            'zip_code' => $this->payment_method == 'Iyzico' ? 'required' : '',

        ];
        if ($this->payment_method == 'stripe') {
            $ruleArray['stripeToken'] = 'required';
        }
        return $ruleArray;
    }

    public function messages(): array
    {
        return [
            'receipt.required' => __('The receipt image field is required'). '.'
        ];
    }
}
