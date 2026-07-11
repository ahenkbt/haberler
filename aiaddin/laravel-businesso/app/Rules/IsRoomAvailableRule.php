<?php

namespace App\Rules;

use App\Models\User\HotelBooking\Room;
use App\Models\User\HotelBooking\RoomBooking;
use Illuminate\Contracts\Validation\Rule;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

class IsRoomAvailableRule implements Rule
{
    private $roomId;
    private $roomBookedDates;
    private $bookingInfoId;

    /**
     * Create a new rule instance.
     *
     * @return void
     */
    public function __construct($id, $bookingId = null)
    {
        $this->roomId = $id;
        $this->bookingInfoId = $bookingId;
    }

    /**
     * Determine if the validation rule passes.
     *
     * @param  string  $attribute
     * @param  mixed  $value
     * @return bool
     */
    public function passes($attribute, $value)
    {
        // get arrival & departure date from the string
        $dateArray = explode(' ', $value);
        $date1 = $dateArray[0];
        $date2 = $dateArray[2];

        // get all the dates between the start & end date
        $allDates = $this->getAllDates($date1, $date2, 'Y-m-d');

        // get quantity of the room
        // dd(Room::query()->findOrFail($this->roomId)->quantity);
        $quantity = Room::query()->findOrFail($this->roomId)->quantity;

        // get all the bookings of the room

        if (Auth::guard('web')->check()) {
            $bookings = RoomBooking::query()->where('room_id', '=', $this->roomId)
                ->where('payment_status', '=', 1)
                ->where('user_id', Auth::guard('web')->user()->id)
                ->select('arrival_date', 'departure_date')
                ->get();
        } else {
            $bookings = RoomBooking::query()->where('room_id', '=', $this->roomId)
                ->where('payment_status', '=', 1)
                ->where('user_id', getUser()->id)
                ->select('arrival_date', 'departure_date')
                ->get();
        }

        $bookedDates = [];

        // loop through the list of dates, which we have found from the arrival & departure date
        foreach ($allDates as $date) {
            $bookingCount = 0;

            // loop through all the bookings
            foreach ($bookings as $currentBooking) {
                $bookingStartDate = Carbon::parse($currentBooking->arrival_date);
                $bookingEndDate = Carbon::parse($currentBooking->departure_date)->subDay();
                $currentDate = Carbon::parse($date);

                // check for each date, whether the date is present or not in any of the booking date range
                if ($currentDate->betweenIncluded($bookingStartDate, $bookingEndDate)) {
                    $bookingCount++;
                }
            }

            // if the number of booking of a specific date is same as the room quantity, then mark that date as unavailable
            if ($bookingCount >= $quantity && !in_array($date, $bookedDates)) {
                array_push($bookedDates, $date);
            }
        }

        if (!is_null($this->bookingInfoId)) {
            $booking = RoomBooking::query()->findOrFail($this->bookingInfoId);
            $arrivalDate = $booking->arrival_date;
            $departureDate = $booking->departure_date;

            // get all the dates between the booking arrival date & booking departure date
            $bookingAllDates = $this->getAllDates($arrivalDate, $departureDate, 'Y-m-d');

            // remove dates of this booking from 'bookedDates' array while editing a room booking
            foreach ($bookingAllDates as $date) {
                $key = array_search($date, $bookedDates);

                if ($key !== false) {
                    unset($bookedDates[$key]);
                }
            }

            array_values($bookedDates);
        }

        // if 'bookedDates' array has any data, then return validation failed
        if (count($bookedDates) > 0) {
            $this->roomBookedDates = $bookedDates;

            return false;
        } else {
            return true;
        }
    }

    /**
     * Get the validation error message.
     *
     * @return string
     */
    public function message()
    {
        $allBookedDates = '';

        // get the array length
        $arrLen = count($this->roomBookedDates);

        foreach ($this->roomBookedDates as $key => $bookedDate) {
            // checking whether the current index is the last position of the array
            if (($arrLen - 1) == $key) {
                $allBookedDates .= $bookedDate;
            } else {
                $allBookedDates .= $bookedDate . ', ';
            }
        }

        return 'The room is booked on these following dates: ' . $allBookedDates . '.';
    }

    /**
     * Get all the dates between the arrival & departure date.
     *
     * @param  string  $arrivalDate
     * @param  string  $departureDate
     * @param  string  $format
     * @return array
     */
    public function getAllDates($arrivalDate, $departureDate, $format)
    {
        $dates = [];

        // convert string to timestamps
        $currentTimestamps = strtotime($arrivalDate);
        $endTimestamps = strtotime($departureDate);

        // set an increment value
        $stepValue = '+1 day';

        // push all the timestamps to the 'dates' array by formatting those timestamps into date
        while ($currentTimestamps < $endTimestamps) {
            $formattedDate = date($format, $currentTimestamps);
            array_push($dates, $formattedDate);
            $currentTimestamps = strtotime($stepValue, $currentTimestamps);
        }

        return $dates;
    }
}
