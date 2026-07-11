<?php

namespace App\Http\Requests\User\HoteBooking;

use App\Rules\IsRoomAvailableRule;
use Illuminate\Foundation\Http\FormRequest;

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
        if ($this->filled('booking_id')) {
            $booking_id = $this->booking_id;
        } else {
            $booking_id = null;
        }

        return [
            'dates' => [
                'required',
                new IsRoomAvailableRule($this->room_id, $booking_id)
            ],
            'nights' => 'required',
            'guests' => 'required|numeric|min:1',
            'customer_name' => 'required',
            'customer_phone' => 'required',
            'customer_email' => 'required|email:rfc,dns',
            'payment_method' => 'required',
            'payment_status' => 'required'
        ];
    }
}
