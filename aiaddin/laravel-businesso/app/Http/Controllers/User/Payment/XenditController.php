<?php

namespace App\Http\Controllers\User\Payment;

use App\Http\Controllers\Controller;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Http;
use App\Traits\MiscellaneousTrait;
use App\Http\Controllers\Front\RoomBookingController;
use App\Models\User\HotelBooking\RoomBooking;
use Illuminate\Support\Facades\Session;

class XenditController extends Controller
{
    public function paymentProcess(Request $request, $_amount, $_title, $_success_url)
    {
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $user = getUser();
        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($user->id);
        $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
        $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
        $information['currency_text'] = $currencyInfo->base_currency_text;
        $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
        $information['method'] = 'Xendit';
        $information['type'] = 'online';
        $title = $_title;
        $roomBooking = new RoomBookingController();

        Session::put('user_request', $request->all());
        Session::put('user_amount', $_amount);
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase End ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Payment Gateway Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $paymentMethod = UserPaymentGeteway::where([['user_id', $user->id], ['keyword', 'xendit']])->first();
        $paydata = json_decode($paymentMethod->information, true);
        $external_id = Str::random(10);
        $secret_key = 'Basic ' . base64_encode($paydata['secret_key'] . ':');
        $data_request = Http::withHeaders([
            'Authorization' => $secret_key
        ])->post('https://api.xendit.co/v2/invoices', [
            'external_id' => $external_id,
            'amount' => $_amount,
            'currency' => $currencyInfo->base_currency_text,
            'success_redirect_url' => $_success_url
        ]);
        $response = $data_request->object();
        $response = json_decode(json_encode($response), true);
        if (!empty($response['success_redirect_url'])) {
            $request->session()->put('xendit_id', $response['id']);
            $request->session()->put('secret_key', $secret_key);

            return redirect($response['invoice_url']);
        } else {
            if (array_key_exists('title', $request->all()) &&  $request['title'] == "Room Booking") {
                $cancel_url = route('front.user.room_booking.cancel', getParam());
            } else {
                $cancel_url = route('customer.itemcheckout.perfect_money.cancel', getParam());
            }
            return redirect($cancel_url);
        }
    }

    // return to success page
    public function successPayment(Request $request)
    {
        $requestData = Session::get('user_request');
        $keywords = getUserKeywords();

        if (array_key_exists('title', $requestData) &&  $requestData['title'] == "Room Booking") {
            $cancel_url = route('front.user.room_booking.cancel', getParam());
        } else {
            $cancel_url = route('customer.itemcheckout.perfect_money.cancel', getParam());
        }

        $user = getUser();
        $xendit_id = Session::get('xendit_id');
        $secret_key = Session::get('secret_key');
        $paymentMethod = UserPaymentGeteway::where([['user_id', $user->id], ['keyword', 'xendit']])->first();
        $paydata = json_decode($paymentMethod->information, true);

        $p_secret_key = 'Basic ' . base64_encode($paydata['secret_key'] . ':');
        if (!is_null($xendit_id) && $secret_key == $p_secret_key) {
            $txnId = $request->transactionId;
            $chargeId = $request->transactionId;

            if (array_key_exists('title', $requestData) && $requestData['title'] == "Room Booking") {

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
                Session::forget('bookingId');
            } else {


                $order = $this->saveOrder($requestData, $txnId, $chargeId, 'Completed');
                $order_id = $order->id;
                $this->saveOrderedItems($order_id);
                $this->sendMails($order);
            }
            session()->flash('success', $keywords['successful_payment'] ?? __('successful payment'));
            Session::forget('user_request');
            Session::forget('user_amount');
            if (array_key_exists('title', $requestData) && $requestData['title'] == "Room Booking") {
                return redirect()->route('customer.success.page', [getParam(), 'room-booking']);
            }
            return redirect()->route('customer.success.page', [getParam()]);
        } else {
            $keywords = getUserKeywords();
            session()->flash('warning', $keywords['cancel_payment'] ?? __('cancel payment'));
            return redirect($cancel_url);
        }
    }
}
