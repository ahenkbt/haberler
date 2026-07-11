<?php

namespace App\Http\Controllers\Front;

use App\Http\Controllers\Controller;
use App\Http\Controllers\User\Payment\AuthorizenetController;
use App\Http\Controllers\User\Payment\FlutterWaveController;
use App\Http\Controllers\User\Payment\InstamojoController;
use App\Http\Controllers\User\Payment\MercadopagoController;
use App\Http\Controllers\User\Payment\MollieController;
use App\Http\Controllers\User\Payment\OfflineController;
use App\Http\Controllers\User\Payment\PaypalController;
use App\Http\Controllers\User\Payment\PaystackController;
use App\Http\Controllers\User\Payment\PaytmController;
use App\Http\Controllers\User\Payment\PerfectMoneyController;
use App\Http\Controllers\User\Payment\RazorpayController;
use App\Http\Controllers\User\Payment\StripeController;
use App\Http\Requests\Front\HotelBooking\RoomBookingRequest;
use App\Models\User\BasicSetting;
use App\Models\User\HotelBooking\Coupon;
use App\Models\User\HotelBooking\Room;
use App\Models\User\HotelBooking\RoomAmenity;
use App\Models\User\HotelBooking\RoomBooking;
use App\Models\User\HotelBooking\RoomContent;
use App\Models\User\UserEmailTemplate;
use App\Traits\MiscellaneousTrait;
use DateTime;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;
use PDF;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;
use App\Http\Controllers\User\Payment\PhonePeController;
use App\Http\Controllers\User\Payment\XenditController;
use App\Http\Controllers\User\Payment\YocoController;
use App\Http\Controllers\User\Payment\ToyyibpayController;
use App\Http\Controllers\User\Payment\PaytabsController;
use App\Http\Controllers\User\Payment\MidtransController;
use App\Http\Controllers\User\Payment\IyzicoController;
use App\Http\Controllers\User\Payment\ShopMyFatoorahController;

class RoomBookingController extends Controller
{
    use MiscellaneousTrait;
    public function makeRoomBooking($username, RoomBookingRequest $request)
    {
        $user = getUser();
        $bs = BasicSetting::where('user_id', $user->id)->firstorFail();
        $keywords = getUserKeywords();

        $title = "Room Booking";

        $calculatedData =  $this->calculation($request);

        $request->merge([
            'subtotal' => $calculatedData['subtotal'],
            'discount' => $calculatedData['discount'],
            'total' => $calculatedData['total'],
            'title' => $title
        ]);

        // check whether user is logged in or not (start)
        $status = DB::table('user_room_settings')->where('user_id', $user->id)->select('room_guest_checkout_status')
            ->first();
        $user = getUser();
        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($user->id);
        if (($status->room_guest_checkout_status == 0) && (Auth::guard('customer')->check() == false)) {

            session()->flash('warning', $keywords['Please_login_first'] ?? 'Please login first');
            return redirect()->route('customer.login', [getParam(), 'redirectPath' => 'room_details']);
        }
        // check whether user is logged in or not (end)
        $cancel_url = route('front.user.room_booking.cancel', getParam());
        if ($request->paymentType == 'none') {
            session()->flash('error', $keywords['Please_select_a_payment_method'] ?? 'Please select a payment method'. '.');

            return redirect()->back()->withInput();
        } else if ($request->paymentType == 'paypal') {
            if (empty($bs->base_currency_rate)) {
                return redirect()->back()->with('error', $keywords['Base_currency_rate_not_found'] ?? __('Base currency rate not found'))->withInput($request->all());
            }

            $success_url = route('front.user.room_booking.notify', getParam());

            $paypal = new PaypalController();

            return $paypal->paymentProcess($request, $request['total'], $title, $success_url, $cancel_url);
        } else if ($request->paymentType == 'stripe') {
            if (empty($bs->base_currency_rate)) {
                return redirect()->back()->with('error', $keywords['Base_currency_rate_not_found'] ?? __('Base currency rate not found'))->withInput($request->all());
            }
            $success_url = route('front.user.room_booking.stripe.notify', getParam());
            $stripe = new StripeController();
            return $stripe->paymentProcess($request, $request['total'], $title, $success_url, $cancel_url);
        } else if ($request->paymentType == 'paytm') {

            $callback_url = route('front.user.room_booking.paytm.notify', getParam());
            $calculatedData = $this->calculation($request);

            // checking whether the currency is set to 'INR' or not
            if ($currencyInfo->base_currency_text !== 'INR') {
                return redirect()->back()->with('error', 'Invalid currency for paytm payment.');
            }
            $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
            $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
            $information['currency_text'] = $currencyInfo->base_currency_text;
            $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
            $information['method'] = 'Paytm';
            $information['type'] = 'online';
            $booking_details = $this->storeData($request, $information);
            Session::put('bookingId', $booking_details->id);
            Session::put('payment_title', $title);

            $paytm = new PaytmController();
            return $paytm->paymentProcess($request, $request['total'], null, $callback_url, $title);
        } else if ($request->paymentType == 'instamojo') {

            // checking whether the currency is set to 'INR' or not
            if ($currencyInfo->base_currency_text !== 'INR') {
                return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for instamojo payment.');
            }
            $instamojo = new InstamojoController();

            $success_url = route('front.user.room_booking.instamojo.notify', getParam());
            return $instamojo->paymentProcess($request, $request['total'], $success_url, $cancel_url, $title, null);
        } else if ($request->paymentType == 'paystack') {

            // checking whether the currency is set to 'NGN' or not
            if ($currencyInfo->base_currency_text !== 'NGN') {
                return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for paystack payment.');
            }
            $paystack = new PaystackController();
            $success_url = route('front.user.room_booking.instamojo.notify', getParam());
            return $paystack->paymentProcess($request, $request['total'], $request['customer_email'], $success_url, null);
        } else if ($request->paymentType == 'flutterwave') {
            $available_currency = array('BIF', 'CAD', 'CDF', 'CVE', 'EUR', 'GBP', 'GHS', 'GMD', 'GNF', 'KES', 'LRD', 'MWK', 'NGN', 'RWF', 'SLL', 'STD', 'TZS', 'UGX', 'USD', 'XAF', 'XOF', 'ZMK', 'ZMW', 'ZWD');
            // checking whether the base currency is allowed or not
            if (!in_array($currencyInfo->base_currency_text, $available_currency)) {
                return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for flutterwave payment.');
            }

            $success_url = route('front.user.room_booking.flutterwave.notify', getParam());
            $flutterwave = new FlutterWaveController();

            return $flutterwave->paymentProcess($request, $request['total'], $request['customer_email'], uniqid(5), $success_url, $cancel_url, $currencyInfo);
        } else if ($request->paymentType == 'mollie') {
            $available_currency = array('AED', 'AUD', 'BGN', 'BRL', 'CAD', 'CHF', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HRK', 'HUF', 'ILS', 'ISK', 'JPY', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PLN', 'RON', 'RUB', 'SEK', 'SGD', 'THB', 'TWD', 'USD', 'ZAR');
            // checking whether the base currency is allowed or not
            if (!in_array($currencyInfo->base_currency_text, $available_currency)) {
                return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for mollie payment.');
            }
            $success_url = route('front.user.room_booking.mollie.notify', getParam());
            $mollie = new MollieController();

            return $mollie->paymentProcess($request, $request['total'], $success_url, $cancel_url, $title, $currencyInfo);
        } else if ($request->paymentType == 'razorpay') {
            // checking whether the currency is set to 'INR' or not
            if ($currencyInfo->base_currency_text !== 'INR') {
                return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for razorpay payment.');
            }
            $success_url = route('front.user.room_booking.razorpay.notify', getParam());
            $razorpay = new RazorpayController();
            // dd($bs);
            return $razorpay->paymentProcess($request, $request['total'], uniqid(5), $cancel_url, $success_url, $title,  "Paying for Room Booking", $bs);
        } else if ($request->paymentType == 'mercadopago') {
            $available_currency = array('ARS', 'BOB', 'BRL', 'CLF', 'CLP', 'COP', 'CRC', 'CUC', 'CUP', 'DOP', 'EUR', 'GTQ', 'HNL', 'MXN', 'NIO', 'PAB', 'PEN', 'PYG', 'USD', 'UYU', 'VEF', 'VES');
            // checking whether the base currency is allowed or not
            if (!in_array($currencyInfo->base_currency_text, $available_currency)) {
                return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for mercadopago payment.');
            }
            $success_url = route('front.user.room_booking.mercadopago.notify', getparam());
            $mercadopago = new MercadopagoController();

            return $mercadopago->paymentProcess($request, $request['total'], $success_url, $cancel_url, $request['customer_email'], $title, "Paying for Room Booking", $bs);
        } else if ($request->paymentType == 'authorize.net') {
            $allowedCurrencies = array('USD', 'CAD', 'CHF', 'DKK', 'EUR', 'GBP', 'NOK', 'PLN', 'SEK', 'AUD', 'NZD');
            // checking whether the base currency is allowed or not
            if (!in_array($currencyInfo->base_currency_text, $allowedCurrencies)) {
                return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for authorize.net payment.')->withInput();
            }
            $authorizeNet = new AuthorizenetController();
            return $authorizeNet->paymentProcess($request, $request['total'], $cancel_url, $title, $currencyInfo);
        } else if ($request->paymentType == 'phonepe') {

            $callback_url = route('front.user.room_booking.phonepe.notify', getParam());

            // checking whether the currency is set to 'INR' or not
            if ($currencyInfo->base_currency_text !== 'INR') {
                return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for phonepe payment.');
            }
            $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
            $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
            $information['currency_text'] = $currencyInfo->base_currency_text;
            $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
            $information['method'] = 'PhonePe';
            $information['type'] = 'online';
            $booking_details = $this->storeData($request, $information);
            Session::put('bookingId', $booking_details->id);
            Session::put('payment_title', $title);

            $paytm = new PhonePeController();
            return $paytm->paymentProcess($request, $request['total'], 'Room Booking', $callback_url, $title);
        } else if ($request->paymentType == 'perfect_money') {

            $callback_url = route('front.user.room_booking.perfect_money.notify', getParam());

            // checking whether the currency is set to 'INR' or not
            if ($currencyInfo->base_currency_text !== 'USD') {
                return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for perfect money payment.');
            }
            $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
            $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
            $information['currency_text'] = $currencyInfo->base_currency_text;
            $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
            $information['method'] = 'Perfect Money';
            $information['type'] = 'online';
            $booking_details = $this->storeData($request, $information);
            Session::put('bookingId', $booking_details->id);
            Session::put('payment_title', $title);

            $perfect_money = new PerfectMoneyController();
            return $perfect_money->paymentProcess($request, $request['total'], null, $callback_url, $title);
        } else if ($request->paymentType == 'xendit') {

            $callback_url = route('front.user.room_booking.xendit.notify', getParam());

            // checking whether the currency is set to 'INR' or not 
            $allowed_currency = array('IDR', 'PHP', 'USD', 'SGD', 'MYR');
            if (!in_array($currencyInfo->base_currency_text, $allowed_currency)) {
                return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for perfect money payment.');
            }
            $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
            $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
            $information['currency_text'] = $currencyInfo->base_currency_text;
            $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
            $information['method'] = 'Xendit';
            $information['type'] = 'online';
            $booking_details = $this->storeData($request, $information);
            Session::put('bookingId', $booking_details->id);
            Session::put('payment_title', $title);

            $xendit = new XenditController();
            return $xendit->paymentProcess($request, $request['total'], 'Room Booking', $callback_url, $title);
        } else if ($request->paymentType == 'yoco') {

            $callback_url = route('front.user.room_booking.yoco.notify', getParam());

            // checking whether the currency is set to 'ZAR' or not 
            if ($currencyInfo->base_currency_text != 'ZAR') {
                return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for yoco payment.');
            }
            $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
            $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
            $information['currency_text'] = $currencyInfo->base_currency_text;
            $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
            $information['method'] = 'Yoco';
            $information['type'] = 'online';
            $booking_details = $this->storeData($request, $information);
            Session::put('bookingId', $booking_details->id);
            Session::put('payment_title', $title);

            $yoco = new YocoController();
            return $yoco->paymentProcess($request, $request['total'], 'Room Booking', $callback_url, $title);
        } else if ($request->paymentType == 'toyyibpay') {

            $callback_url = route('front.user.room_booking.toyyibpay.notify', getParam());

            // checking whether the currency is set to 'ZAR' or not 
            if ($currencyInfo->base_currency_text != 'RM') {
                return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for toyyibpay payment.');
            }
            $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
            $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
            $information['currency_text'] = $currencyInfo->base_currency_text;
            $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
            $information['method'] = 'Toyyibpay';
            $information['type'] = 'online';
            $booking_details = $this->storeData($request, $information);
            Session::put('bookingId', $booking_details->id);
            Session::put('payment_title', $title);

            $toyyibpay = new ToyyibpayController();
            return $toyyibpay->paymentProcess($request, $request['total'], null, $callback_url, $title);
        } else if ($request->paymentType == 'paytabs') {

            $callback_url = route('front.user.room_booking.paytabs.notify', getParam());
            $paytabInfo = paytabInfo('user', $user->id);
            // checking whether the currency is set to 'ZAR' or not 
            if ($currencyInfo->base_currency_text != $paytabInfo['currency']) {
                return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for paytabs payment.');
            }
            $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
            $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
            $information['currency_text'] = $currencyInfo->base_currency_text;
            $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
            $information['method'] = 'Paytabs';
            $information['type'] = 'online';
            $booking_details = $this->storeData($request, $information);
            Session::put('bookingId', $booking_details->id);
            Session::put('payment_title', $title);

            $paytabs = new PaytabsController();
            return $paytabs->paymentProcess($request, $request['total'], 'Room Booking', $callback_url, $title);
        } else if ($request->paymentType == 'midtrans') {

            $callback_url = route('front.user.room_booking.midtrans.notify', getParam());
            if ($currencyInfo->base_currency_text != 'IDR') {
                return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for midtrans payment.');
            }
            $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
            $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
            $information['currency_text'] = $currencyInfo->base_currency_text;
            $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
            $information['method'] = 'Midtrans';
            $information['type'] = 'online';
            $booking_details = $this->storeData($request, $information);
            Session::put('bookingId', $booking_details->id);
            Session::put('payment_title', $title);

            $midtrans = new MidtransController();
            return $midtrans->paymentProcess($request, $request['total'], 'Room Booking', $callback_url, $title);
        } else if ($request->paymentType == 'iyzico') {

            $callback_url = route('front.user.room_booking.iyzico.notify', getParam());
            if ($currencyInfo->base_currency_text != 'TRY') {
                return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for midtrans payment.');
            }
            $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
            $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
            $information['currency_text'] = $currencyInfo->base_currency_text;
            $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
            $information['method'] = 'Iyzico';
            $information['type'] = 'online';
            Session::put('payment_title', $title);

            $iyzico = new IyzicoController();
            return $iyzico->paymentProcess($request, $request['total'], 'Room Booking', $callback_url, $title);
        } else if ($request->paymentType == 'myfatoorah') {
            $allowed_currency = array('KWD', 'SAR', 'BHD', 'AED', 'QAR', 'OMR', 'JOD');
            if (!in_array($currencyInfo->base_currency_text, $allowed_currency)) {
                return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for midtrans payment.');
            }
            $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
            $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
            $information['currency_text'] = $currencyInfo->base_currency_text;
            $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
            $information['method'] = 'MyFatoorah';
            $information['type'] = 'online';
            Session::put('payment_title', $title);
            $booking_details = $this->storeData($request, $information);
            Session::put('bookingId', $booking_details->id);

            $myfatoorah = new ShopMyFatoorahController();
            return $myfatoorah->paymentProcess($request, $request['total'], 'Room Booking');
        } else {
            $offline = new OfflineController();

            $offline->bookingProcess($request);
            $request = 'room-booking';
            return view('user-front.offline-success', compact('request'));
        }
    }

    public function calculation(Request $request)
    {
        $roomInfo = Room::findOrFail($request->room_id);

        $subtotal = floatval($roomInfo->rent) * intval($request->nights);

        if ($request->session()->has('couponCode')) {
            $coupon_code = $request->session()->get('couponCode');

            $coupon = Coupon::where('code', $coupon_code)->first();

            if (!is_null($coupon)) {
                $couponVal = floatval($coupon->value);

                if ($coupon->type == 'fixed') {
                    $total = $subtotal - $couponVal;

                    $calculatedData = array(
                        'subtotal' => $subtotal,
                        'discount' => $couponVal,
                        'total' => $total
                    );
                } else {
                    $discount = $subtotal * ($couponVal / 100);
                    $total = $subtotal - $discount;

                    $calculatedData = array(
                        'subtotal' => $subtotal,
                        'discount' => $discount,
                        'total' => $total
                    );
                }
            } else {
                $calculatedData = array(
                    'subtotal' => $subtotal,
                    'discount' => 0.00,
                    'total' => $subtotal
                );
            }
        } else {
            $calculatedData = array(
                'subtotal' => $subtotal,
                'discount' => 0.00,
                'total' => $subtotal
            );
        }

        $request->session()->forget('couponCode');

        return $calculatedData;
    }
    public function storeData(Request $request, $information)
    {
        $dateArray = explode(' ', $request->dates);
        $user = getUser();
        $booking_details = RoomBooking::create([
            'booking_number' => time(),
            'user_id' => $user->id,
            'customer_id' => Auth::guard('customer')->check() == true ? Auth::guard('customer')->user()->id : null,
            'customer_name' => $request->customer_name,
            'customer_email' => $request->customer_email,
            'customer_phone' => $request->customer_phone,
            'room_id' => $request->room_id,
            'arrival_date' => $dateArray[0],
            'departure_date' => $dateArray[2],
            'guests' => $request->guests,
            'subtotal' => $request->subtotal,
            'discount' => $request->discount,
            'grand_total' => $request->total,
            'currency_symbol' => $information['currency_symbol'],
            'currency_symbol_position' => $information['currency_symbol_position'],
            'currency_text' => $information['currency_text'],
            'currency_text_position' => $information['currency_text_position'],
            'payment_method' => $information['method'],
            'gateway_type' => $information['type'],
            'attachment' => $request->hasFile('attachment') ? $information['attachment'] : null,
            'conversation_id' => array_key_exists('conversation_id', $information) ? $information['conversation_id'] : null
        ]);

        return $booking_details;
    }

    public function generateInvoice($bookingInfo)
    {
        $fileName = $bookingInfo->booking_number . '.pdf';
        $directory = public_path('assets/invoices/rooms/');

        if (!file_exists($directory)) {
            mkdir($directory, 0775, true);
        }

        $fileLocated = $directory . $fileName;

        PDF::loadView('user-front.room.booking_pdf', compact('bookingInfo'))->save($fileLocated);

        return $fileName;
    }
    public function sendMail($bookingInfo)
    {
        // first get the mail template information from db
        $mailTemplate = UserEmailTemplate::where('user_id', $bookingInfo->user_id)->where('email_type', 'room_booking')->first();
        $mailSubject = $mailTemplate->email_subject;
        $mailBody = replaceBaseUrl($mailTemplate->email_body, 'summernote');

        // second get the website title & mail's smtp information from db
        $basicExtends = DB::table('basic_extendeds')
            ->select('is_smtp', 'smtp_host', 'smtp_port', 'encryption', 'smtp_username', 'smtp_password', 'from_mail')
            ->first();
        $basicSettings = DB::table('user_basic_settings')->where('user_id', $bookingInfo->user_id)->select('website_title', 'from_name', 'email')->first();


        $date1 = new DateTime($bookingInfo->arrival_date);
        $date2 = new DateTime($bookingInfo->departure_date);
        $interval = $date1->diff($date2, true);

        // get the room category name according to language
        $language = MiscellaneousTrait::getCustomerCurrentLanguage();

        $roomContent = RoomContent::where([['room_id', $bookingInfo->room_id], ['user_id', $bookingInfo->user_id]])
            ->where('language_id', $language->id)
            ->first();

        $roomCategoryName = $roomContent->roomCategory->name;

        $roomRent = ($bookingInfo->currency_text_position == 'left' ? $bookingInfo->currency_text . ' ' : '') . $bookingInfo->grand_total . ($bookingInfo->currency_text_position == 'right' ? ' ' . $bookingInfo->currency_text : '');

        // get the amenities of booked room
        $amenityIds = json_decode($roomContent->amenities);

        $amenityArray = [];

        if (!is_null($amenityIds)) {
            foreach ($amenityIds as $id) {
                $amenity = RoomAmenity::findOrFail($id);
                array_push($amenityArray, $amenity->name);
            }
        }

        // now, convert amenity array into comma separated string
        $amenityString = implode(', ', $amenityArray);

        // replace template's curly-brace string with actual data
        $mailBody = str_replace('{customer_name}', $bookingInfo->customer_name, $mailBody);
        $mailBody = str_replace('{room_name}', $roomContent->title, $mailBody);
        $mailBody = str_replace('{room_rent}', $roomRent, $mailBody);
        $mailBody = str_replace('{booking_number}', $bookingInfo->booking_number, $mailBody);
        $mailBody = str_replace('{booking_date}', date_format($bookingInfo->created_at, 'F d, Y'), $mailBody);
        $mailBody = str_replace('{number_of_night}', $interval->days, $mailBody);
        $mailBody = str_replace('{website_title}', $basicSettings->website_title, $mailBody);
        $mailBody = str_replace('{check_in_date}', $bookingInfo->arrival_date, $mailBody);
        $mailBody = str_replace('{check_out_date}', $bookingInfo->departure_date, $mailBody);
        $mailBody = str_replace('{number_of_guests}', $bookingInfo->guests, $mailBody);
        $mailBody = str_replace('{room_type}', $roomCategoryName, $mailBody);
        $mailBody = str_replace('{room_amenities}', $amenityString, $mailBody);

        // initialize a new mail
        $mail = new PHPMailer(true);
        $mail->CharSet = 'UTF-8';
        $mail->Encoding = 'base64';

        // if smtp status == 1, then set some value for PHPMailer
        if ($basicExtends->is_smtp == 1) {

            $mail->isSMTP();
            $mail->Host       = $basicExtends->smtp_host;
            $mail->SMTPAuth   = true;
            $mail->Username   = $basicExtends->smtp_username;
            $mail->Password   = $basicExtends->smtp_password;

            // if ($basicExtends->encryption == 'TLS') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            // }

            $mail->Port       = 587;
        }
        // dd('ok', $basicExtends, $basicSettings, $bookingInfo);

        // finally add other informations and send the mail
        try {
            // Recipients
            $mail->setFrom($basicExtends->from_mail, $basicSettings->from_name);
            $mail->addAddress($bookingInfo->customer_email);
            $mail->AddReplyTo($basicSettings->email);
            // Attachments (Invoice)
            $mail->addAttachment(public_path('assets/invoices/rooms/' . $bookingInfo->invoice));

            // Content
            $mail->isHTML(true);
            $mail->Subject = $mailSubject;
            $mail->Body    = $mailBody;

            $mail->send();

            return;
        } catch (Exception $e) {
            return redirect()->route('front.user.rooms', getParam())->with('error', 'Mail could not be sent!');
        }
    }

    public function complete()
    {
        return view('user-front.room.paymemt_success');
    }

    public function cancel()
    {
        return redirect()->route('front.user.rooms', getParam())->with('error', 'Sorry, an error has occured!');
    }
}
