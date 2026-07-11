<?php

namespace App\Http\Controllers\User\Payment;

use Carbon\Carbon;
use App\Models\Package;
use App\Models\Language;
use Illuminate\Http\Request;
use App\Http\Helpers\MegaMailer;
use App\Models\User\UserPackage;
use App\Models\User\BasicSetting;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\RoomBookingController;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Support\Facades\Session;
use App\Http\Helpers\UserPermissionHelper;
use App\Http\Controllers\Front\UserCheckoutController;
use App\Models\User\HotelBooking\RoomBooking;
use App\Traits\MiscellaneousTrait;

class PaystackController extends Controller
{
    use MiscellaneousTrait;
    public function __construct()
    {
    }
    /**
     * Redirect the User to Paystack Payment Page
     * @return
     */
    public function paymentProcess(Request $request, $_amount, $_email, $_success_url, $bex)
    {
    

        $data = UserPaymentGeteway::whereKeyword('paystack')->where('user_id', getUser()->id)->first();
        $paydata = $data->convertAutoData();

        $secret_key = $paydata['key'];
        $_amount =  intval($_amount * 100);
        $curl = curl_init();
        $callback_url = $_success_url; // url to go to after payment

        curl_setopt_array($curl, array(
            CURLOPT_URL => "https://api.paystack.co/transaction/initialize",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => "POST",
            CURLOPT_POSTFIELDS => json_encode([
                'amount' => $_amount,
                'email' => $_email,
                'callback_url' => $callback_url
            ]),
            CURLOPT_HTTPHEADER => [
                "authorization: Bearer " . $secret_key, //replace this with your own test key
                "content-type: application/json",
                "cache-control: no-cache"
            ],
        ));

        $response = curl_exec($curl);
        $err = curl_error($curl);
        if ($err) {
            return redirect()->back()->with('error', $err);
        }
        $tranx = json_decode($response, true);
        if ($request['title'] == "Room Booking") {
            $roomBooking = new RoomBookingController();
            $currencyInfo = MiscellaneousTrait::getCurrencyInfo(getUser()->id);
            $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
            $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
            $information['currency_text'] = $currencyInfo->base_currency_text;
            $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
            $information['method'] = 'Paystack';
            $information['type'] = 'online';
            $booking_details = $roomBooking->storeData($request, $information);
            session()->put('bookingId', $booking_details->id);
        }
        Session::put('user_request', $request->all());

        if (!$tranx['status']) {
            return redirect()->back()->with("error", $tranx['message']);
        }


        return redirect($tranx['data']['authorization_url']);
    }

    public function successPayment(Request $request)
    {
        $requestData = Session::get('user_request');

        $user = getUser();
        $keywords = getUserKeywords();

        $be = BasicSetting::where('user_id', $user->id)->firstorFail();
        if ($request['trxref'] === $request['reference']) {
            $txnId = UserPermissionHelper::uniqidReal(8);
            $chargeId = $request->paymentId;
            if (in_array('title', $requestData) && $requestData['title'] == "Room Booking") {
                $bookingId = $request->session()->get('bookingId');
                $bookingInfo = RoomBooking::findOrFail($bookingId);

                $bookingInfo->update(['payment_status' => 1]);

                $roomBooking = new RoomBookingController();

                // generate an invoice in pdf format
                $invoice = $roomBooking->generateInvoice($bookingInfo);

                // update the invoice field information in database
                $bookingInfo->update(['invoice' => $invoice]);

                // send a mail to the customer with an invoice
                $roomBooking->sendMail($bookingInfo);

                // remove all session data
                $request->session()->forget('bookingId');
            } else {
                $order = $this->saveOrder($requestData, $txnId, null, 'Completed');
                $order_id = $order->id;

                $this->saveOrderedItems($order_id);
                $this->sendMails($order);
            }

            session()->flash('success', $keywords['successful_payment'] ?? __('successful payment'));
            Session::forget('user_request');
            Session::forget('user_amount');
            Session::forget('user_paypal_payment_id');
            if (in_array('title', $requestData) && $requestData['title'] == "Room Booking") {
                return redirect()->route('customer.success.page', [getParam(), 'room-booking']);
            }
            return redirect()->route('customer.success.page', [getParam()]);
        } else {
            session()->flash('warning', $keywords['cancel_payment'] ?? __('cancel payment'));
            return redirect()->route('front.user.pricing', getParam());
        }
    }
}
