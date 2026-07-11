<?php

namespace App\Http\Requests\Front\HotelBooking;

use App\Models\User\HotelBooking\Room;
use App\Rules\IsRoomAvailableRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RoomBookingRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules()
    {
        $maxGuests = Room::query()->findOrFail($this->room_id)->max_guests;
        $ruleArray = [
            'dates' => [
                'required',
                new IsRoomAvailableRule($this->room_id)
            ],
            'nights' => 'required|numeric|min:1',
            'guests' => ['required', 'numeric', 'min:1', 'max:' . $maxGuests],
            'customer_name' => 'required',
            'customer_phone' => 'required',
            'customer_email' => 'required|email:rfc,dns'
        ];

        if ($this->paymentType == 'stripe') {
            $ruleArray['stripeToken'] = 'required';
        }
        if ($this->paymentType == 'authorize.net') {
            $ruleArray['AuthorizeCardNumber'] = 'required';
            $ruleArray['AuthorizeCardCode'] = 'required';
            $ruleArray['AuthorizeMonth'] = 'required';
            $ruleArray['AuthorizeYear'] = 'required';
        }
        if ($this->paymentType == 'iyzico') {
            $ruleArray['city'] = 'required';
            $ruleArray['country'] = 'required';
            $ruleArray['zip_code'] = 'required';
            $ruleArray['address'] = 'required';
            $ruleArray['identity_number'] = 'required';
        }

        return $ruleArray;
    }

    public function messages()
    {
        $keywords = getUserKeywords();

        return [
            'dates.required' => $keywords['dates_required'] ?? 'The dates field is required.',
            'nights.required' => $keywords['nights_required'] ?? 'The nights field is required.',
            'nights.numeric' => $keywords['nights_numeric'] ?? 'The nights must be a number.',
            'nights.min' => $keywords['nights_min'] ?? 'The nights must be at least 1.',
            'guests.required' => $keywords['guests_required'] ?? 'The guests field is required.',
            'guests.numeric' => $keywords['guests_numeric'] ?? 'The guests must be a number.',
            'guests.min' => $keywords['guests_min'] ?? 'The guests must be at least 1.',
            'guests.max' => $keywords['guests_max'] ?? 'The guests may not be greater than :max.',
            'customer_name.required' => $keywords['name_required'] ?? 'The customer name is required.',
            'customer_phone.required' => $keywords['phone_required'] ?? 'The customer phone is required.',
            'customer_email.required' => $keywords['email_required'] ?? 'The customer email is required.',
            'customer_email.email' => $keywords['email_invalid'] ?? 'The customer email must be a valid email address.',
            'stripeToken.required' => $keywords['stripe_token_required'] ?? 'Stripe token is required.',
            'AuthorizeCardNumber.required' => $keywords['card_number_required'] ?? 'Card number is required.',
            'AuthorizeCardCode.required' => $keywords['card_code_required'] ?? 'Card code is required.',
            'AuthorizeMonth.required' => $keywords['month_required'] ?? 'Expiration month is required.',
            'AuthorizeYear.required' => $keywords['year_required'] ?? 'Expiration year is required.',
            'city.required' => $keywords['city_required'] ?? 'City is required.',
            'country.required' => $keywords['country_required'] ?? 'Country is required.',
            'zip_code.required' => $keywords['zip_required'] ?? 'Zip code is required.',
            'address.required' => $keywords['address_required'] ?? 'Address is required.',
            'identity_number.required' => $keywords['id_required'] ?? 'Identity number is required.',
        ];
    }
}
