<?php

namespace App\Http\Requests\User\HotelBooking;

use Illuminate\Foundation\Http\FormRequest;

class CouponRequest extends FormRequest
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
        return [
            'name' => 'required',
            'code' => 'required',
            'type' => 'required',
            'value' => 'required|numeric',
            'start_date' => 'required',
            'end_date' => 'required',
            'serial_number' => 'required|numeric'
        ];
    }
}
