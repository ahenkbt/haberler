<?php

namespace App\Http\Controllers\Front;

use App\Http\Controllers\Controller;
use App\Models\User\BasicSetting;
use App\Models\User\HotelBooking\Coupon;
use App\Models\User\HotelBooking\Room;
use App\Models\User\HotelBooking\RoomAmenity;
use App\Models\User\HotelBooking\RoomBooking;
use App\Models\User\HotelBooking\RoomCategory;
use App\Models\User\HotelBooking\RoomContent;
use App\Models\User\HotelBooking\RoomReview;
use App\Models\User\Language;
use App\Models\User\UserOfflineGateway;
use App\Models\User\UserPaymentGeteway;
use Carbon\CarbonPeriod;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class RoomController extends Controller
{
    public function rooms($username, Request $request)
    {
        $user = getUser();
        $queryResult['roomRating'] = DB::table('user_room_settings')->select('room_rating_status')->first();

        if (session()->has('user_lang')) {
            $userCurrentLang = Language::where('code', session()->get('user_lang'))->where('user_id', $user->id)->first();
            if (empty($userCurrentLang)) {
                $userCurrentLang = Language::where('is_default', 1)->where('user_id', $user->id)->first();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = Language::where('is_default', 1)->where('user_id', $user->id)->first();
        }
        $bs = BasicSetting::where('user_id', $user->id)->select('base_currency_symbol')->first();

        $num_of_bed = $num_of_bath = $num_of_guests = $min_rent = $max_rent = null;

        $roomIds = [];
        $dates = [];

        if ($request->filled('dates')) {
            $dateArray = explode(' ', $request->dates);
            $date1 = $dateArray[0];
            $date2 = $dateArray[2];

            $dates = $this->displayDates($date1, $date2);

            $rooms = Room::where('user_id', $user->id)->get();

            foreach ($rooms as $key => $room) {
                foreach ($dates as $key => $date) {
                    $cDate = Carbon::parse($date);
                    $count = RoomBooking::whereDate('arrival_date', '<=', $cDate)->whereDate('departure_date', '>', $cDate)->where('room_id', $room->id)->count();

                    if ($count >= $room->quantity) {
                        if (!in_array($room->id, $roomIds)) {
                            $roomIds[] = $room->id;
                        }
                    }
                }
            }
        }

        if ($request->filled('beds')) {
            $num_of_bed = $request->beds;
        }
        if ($request->filled('baths')) {
            $num_of_bath = $request->baths;
        }
        if ($request->filled('guests')) {
            $num_of_guests = $request->guests;
        }
        if ($request->filled('rents')) {
            $rents = str_replace($bs->base_currency_symbol, ' ', $request->rents);
            $rentArray = explode(' ', $rents);
            $min_rent = $rentArray[1];
            $max_rent = $rentArray[4];
        }

        $category = $request->category;
        $sortBy = $request->sort_by;
        $ammenities = $request->ammenities;

        $queryResult['Rcategories'] = RoomCategory::where('language_id', $userCurrentLang->id)
            ->where([['status', 1], ['user_id', $user->id]])
            ->orderBy('serial_number', 'asc')
            ->get();

        $queryResult['roomInfos'] = DB::table('user_rooms')
            ->join('user_room_contents', 'user_rooms.id', '=', 'user_room_contents.room_id')
            ->join('user_room_categories', 'user_room_contents.room_category_id', '=', 'user_room_categories.id')
            ->where('user_rooms.status', '=', 1)
            ->where('user_room_contents.language_id', '=', $userCurrentLang->id)
            ->when($category, function ($query) use ($category) {
                return $query->where('user_room_contents.room_category_id', $category);
            })->when($num_of_guests, function ($query, $num_of_guests) {
                return $query->where('max_guests', $num_of_guests);
            })->when($num_of_bed, function ($query, $num_of_bed) {
                return $query->where('bed', $num_of_bed);
            })->when($num_of_bath, function ($query, $num_of_bath) {
                return $query->where('bath', $num_of_bath);
            })->when(($min_rent && $max_rent), function ($query) use ($min_rent, $max_rent) {
                return $query->where('rent', '>=', $min_rent)->where('rent', '<=', $max_rent);
            })->when($ammenities, function ($query, $ammenities) {
                return $query->where(function ($query) use ($ammenities) {
                    foreach ($ammenities as $key => $amm) {
                        if ($key == 0) {
                            $query->where('user_room_contents.amenities', 'LIKE',  "%" . '"' . $amm . '"' . "%");
                        } else {
                            $query->orWhere('user_room_contents.amenities', 'LIKE', "%" . '"' . $amm . '"' . "%");
                        }
                    }
                });
            })->when($sortBy, function ($query, $sortBy) {
                if ($sortBy == 'asc') {
                    return $query->orderBy('user_rooms.id', 'ASC');
                } elseif ($sortBy == 'desc') {
                    return $query->orderBy('user_rooms.id', 'DESC');
                } elseif ($sortBy == 'price-desc') {
                    return $query->orderBy('rent', 'DESC');
                } elseif ($sortBy == 'price-asc') {
                    return $query->orderBy('rent', 'ASC');
                }
            }, function ($query) {
                return $query->orderBy('user_rooms.id', 'DESC');
            })
            ->whereNotIn('user_rooms.id', $roomIds)
            ->paginate(6);

        $queryResult['currencyInfo'] = BasicSetting::where('user_id', $user->id)->first();

        $queryResult['numOfBed'] = Room::where([['status', 1], ['user_id', $user->id]])->max('bed');

        $queryResult['numOfBath'] = Room::where([['status', 1], ['user_id', $user->id]])->max('bath');

        $maxPrice = Room::where([['status', 1], ['user_id', $user->id]])->max('rent');
        $minPrice = Room::where([['status', 1], ['user_id', $user->id]])->where('status', 1)->min('rent');
        $maxGuests = Room::where([['status', 1], ['user_id', $user->id]])->where('status', 1)->max('max_guests');

        $queryResult['maxPrice'] = $maxPrice;
        $queryResult['minPrice'] = $minPrice;
        $queryResult['maxGuests'] = $maxGuests;

        if ($request->filled('rents')) {
            $queryResult['maxRent'] = $max_rent;
            $queryResult['minRent'] = $min_rent;
        } else {
            $queryResult['maxRent'] = $maxPrice;
            $queryResult['minRent'] = $minPrice;
        }

        $queryResult['amenities'] = RoomAmenity::where('language_id', $userCurrentLang->id)->get();
        return view('user-front.room.index', $queryResult);
    }

    public function roomDetails($username, $id, $slug)
    {
        $user = getUser();
        $keywords = getUserKeywords();
        $queryResult['roomRating'] = DB::table('user_room_settings')->where('user_id', $user->id)->select('room_rating_status')->first();

        if (session()->has('user_lang')) {
            $userCurrentLang = Language::where('code', session()->get('user_lang'))->where('user_id', $user->id)->first();
            if (empty($userCurrentLang)) {
                $userCurrentLang = Language::where([['is_default', 1], ['user_id', $user->id]])->first();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = Language::where([['is_default', 1], ['user_id', $user->id]])->first();
        }

        $details = RoomContent::join('user_rooms', 'user_rooms.id', 'user_room_contents.room_id')
            ->where('user_room_contents.language_id', $userCurrentLang->id)
            ->where('user_room_contents.user_id', $user->id)
            ->where('user_room_contents.room_id', $id)
            ->firstOrFail();

        $queryResult['details'] = $details;
        $queryResult['currentLanguageInfo'] = $userCurrentLang;
        $amms = [];

        if (!empty(json_decode($details->amenities)) && $details->amenities != '[]') {
            $ammIds = json_decode($details->amenities, true);
            $ammenities = RoomAmenity::whereIn('id', $ammIds)->orderBy('serial_number', 'ASC')->get();
            foreach ($ammenities as $key => $ammenity) {
                $amms[] = $ammenity->name;
            }
        }

        $queryResult['amms'] = $amms;

        $queryResult['reviews'] = RoomReview::where([['room_id', $id], ['user_id', $user->id]])->orderBy('id', 'DESC')->get();

        $queryResult['currencyInfo'] = BasicSetting::where('user_id', $user->id)->first();

        $bookings = RoomBooking::where('room_id', $id)
            ->where('user_id', $user->id)
            ->select('id', 'arrival_date', 'departure_date')
            ->where('payment_status', 1)
            ->get();

        $qty = Room::findOrFail($id)->quantity;

        $bookedDates = [];

        foreach ($bookings as $key => $booking) {
            // get all dates of a booking date range
            $dates = [];

            $dates = $this->displayDates($booking->arrival_date, $booking->departure_date);
            // loop through the dates
            foreach ($dates as $key => $date) {
                $count = 1;

                foreach ($bookings as $key => $cbooking) {
                    if ($cbooking->id != $booking->id) {
                        $start = Carbon::parse($cbooking->arrival_date);
                        $departure = Carbon::parse($cbooking->departure_date)->subDay();
                        $cDate = Carbon::parse($date);

                        // check if the date is present in other booking's date ranges
                        if ($cDate->gte($start) && $cDate->lte($departure)) {
                            $count++;
                        }
                    }
                }

                // number of booking of a date is equal to room quantity, then mark the date as booked
                if ($count >= $qty && !in_array($date, $bookedDates)) {
                    $bookedDates[] = $date;
                }
            }
        }

        $queryResult['bookingDates'] = $bookedDates;

        $queryResult['onlineGateways'] = UserPaymentGeteway::where([['status', 1], ['user_id', $user->id]])->get();
        //authorize.net payment gateway data start
        $authorizenet = UserPaymentGeteway::where('user_id', $user->id)->whereKeyword('authorize.net')->first();
        $anetInfo = json_decode($authorizenet->information);

        if (!is_null($anetInfo) && $anetInfo->sandbox_check == 1) {
            $queryResult['anetSource'] = 'https://jstest.authorize.net/v1/Accept.js';
        } else {
            $queryResult['anetSource'] = 'https://js.authorize.net/v1/Accept.js';
        }
        if (!is_null($anetInfo)) {
            $queryResult['anetClientKey'] = $anetInfo->public_key;
            $queryResult['anetLoginId'] = $anetInfo->login_id;
        } else {
            $queryResult['anetClientKey'] = null;
            $queryResult['anetLoginId'] = null;
        }
        //authorize.net payment gateway  data end

        $queryResult['offlineGateways'] = UserOfflineGateway::where([
            ['item_checkout_status', 1],
            ['user_id', $user->id]
        ])->orderBy('serial_number', 'asc')
        ->get()->map(function ($gateway) {
            return [
                'id' => $gateway->id,
                'name' => $gateway->name,
                'short_description' => $gateway->short_description,
                'instructions' => replaceBaseUrl($gateway->instructions, 'summernote'),
                'attachment_status' => $gateway->is_receipt,
                'serial_number' => $gateway->serial_number
            ];
        });

        $queryResult['latestRooms'] = RoomContent::where([['language_id', $userCurrentLang->id], ['user_id', $user->id]])->with(['room' => function ($query) {
            $query->where('status', 1);
        }])
            ->where('room_id', '<>', $details->room_id)
            ->where('room_category_id', $details->room_category_id)
            ->orderBy('room_id', 'desc')
            ->limit(3)
            ->get();

            Log::info($queryResult['latestRooms']);

        $stripe = UserPaymentGeteway::where('keyword', 'stripe')->where([['status', 1], ['user_id', $user->id]])->first();
        $queryResult['stripe_key'] = NULL;
        if (!empty($stripe)) {
            $stripe_info = json_decode($stripe->information, true);
            $queryResult['stripe_key'] = $stripe_info['key'];
        }

        $queryResult['avgRating'] = RoomReview::where([['room_id', $id], ['user_id', $user->id]])->avg('rating');

        $queryResult['stripeError'] = $keywords['Your_card_number_is_incomplete'] ?? __('Your card number is incomplete');
        $queryResult['anetCardError'] = $keywords['Please_provide_valid_credit_card_number'] ?? __('Please provide valid credit card number');
        $queryResult['anetYearError'] = $keywords['Please_provide_valid_expiration_year'] ?? __('Please provide valid expiration year');
        $queryResult['anetMonthError'] = $keywords['Please_provide_valid_expiration_month'] ?? __('Please provide valid expiration month');
        $queryResult['anetExpirationDateError'] = $keywords['Expiration_date_must_be_in_the_future'] ?? __('Expiration date must be in the future');
        $queryResult['anetCvvInvalidError'] = $keywords['Please_provide_valid_CVV'] ?? __('Please provide valid CVV');

        return view('user-front.room.details', $queryResult);
    }
    public function displayDates($date1, $date2, $format = 'Y-m-d')
    {
        $dates = array();
        $current = strtotime($date1);
        $date2 = strtotime($date2);
        $stepVal = '+1 day';

        while ($current < $date2) {
            $dates[] = date($format, $current);
            $current = strtotime($stepVal, $current);
        }
        return $dates;
    }
    public function applyCoupon($username, Request $request)
    {
        $keywords = getUserKeywords();
        try {
            
            $coupon = Coupon::where('code', $request->coupon)->firstOrFail();

            $startDate = Carbon::parse($coupon->start_date);
            $endDate = Carbon::parse($coupon->end_date);
            $todayDate = Carbon::now();

            $successMsg = $keywords['coupon_applied_success'] ?? __('Coupon applied successfully') . '.';

            // check coupon is valid or not
            if ($todayDate->between($startDate, $endDate) == false) {
                $errorMsg = $keywords['Sorry_coupon_has_been_expired'] ?? __('Sorry, coupon has been expired') . '.';
                return response()->json(['error' => $errorMsg]);
            }

            // check coupon is valid or not for this room
            $roomId = $request->roomId;
            $roomIds = empty($coupon->rooms) ? '' : json_decode($coupon->rooms);

            if (!empty($roomIds) && !in_array($roomId, $roomIds)) {
                $errorMsg = $keywords['This_coupon_can_be_applied_to_this_room'] ?? __('You can not apply this coupon for this room') . '.';
                return response()->json(['error' => $errorMsg]);
            }

            $request->session()->put('couponCode', $request->coupon);

            $initTotalRent = str_replace(',', '', $request->initTotal);

            if ($initTotalRent == '0.00') {
                $errorMsg = $keywords['First_fillup_the_booking_dates'] ?? __('First, fillup the booking dates') . '.';
                return response()->json(['error' => $errorMsg]);
            } else {
                if ($coupon->type == 'fixed') {
                    $total = floatval($initTotalRent) - floatval($coupon->value);

                    return response()->json([
                        'success' => $successMsg,
                        'discount' => $coupon->value,
                        'total' => $total,
                    ]);
                } else {
                    $initTotalRent = floatval($initTotalRent);
                    $couponVal = floatval($coupon->value);

                    $discount = $initTotalRent * ($couponVal / 100);
                    $total = $initTotalRent - $discount;

                    return response()->json([
                        'success' => $successMsg,
                        'discount' => $discount,
                        'total' => $total
                    ]);
                }
            }
        } catch (Exception $e) {
            $errorMsg = $keywords['coupon_not_valid'] ?? __('Coupon is not valid') . '.';
            return response()->json(['error' => $errorMsg]);
        }
    }

    public function storeReview($username, Request $request, $id)
    {
        $customer = Auth::guard('customer')->user();
        $user = getUser();


        $booking = RoomBooking::where([['customer_id', $customer->id], ['user_id', $user->id]])->where('room_id', $id)->where('payment_status', 1)->count();

        if ($booking == 0) {
            session()->flash('error', "You had not booked this room yet.");

            return back();
        }

        $rules = ['rating' => 'required|numeric'];

        $message = [
            'rating.required' => 'The star rating field is required.'
        ];

        $validator = Validator::make($request->all(), $rules, $message);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }



        $review = RoomReview::where([['customer_id', $customer->id], ['user_id', $user->id]])->where('room_id', $id)->first();

        /**
         * if, room review of auth user does not exist then create a new one.
         * otherwise, update the existing review of that auth user.
         */
        if ($review == null) {
            RoomReview::create($request->except('user_id', 'room_id') + [
                'user_id' => $user->id,
                'customer_id' => $customer->id,
                'room_id' => $id
            ]);

            // now, store the average rating of this room
            $room = Room::findOrFail($id);

            $room->update(['avg_rating' => $request->rating]);
        } else {
            $review->update($request->all());

            // now, get the average rating of this room
            $roomReviews = RoomReview::where('room_id', $id)->get();

            $totalRating = 0;

            foreach ($roomReviews as $roomReview) {
                $totalRating += $roomReview->rating;
            }

            $avgRating = $totalRating / $roomReviews->count();

            // finally, store the average rating of this room
            $room = Room::findOrFail($id);

            $room->update(['avg_rating' => $avgRating]);
        }

        session()->flash('success', 'Review saved successfully!');

        return redirect()->back();
    }
}
