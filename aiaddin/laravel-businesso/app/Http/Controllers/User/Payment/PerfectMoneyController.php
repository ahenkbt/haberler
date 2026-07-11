<?php

namespace App\Http\Controllers\User\Payment;

use App\Http\Controllers\Controller;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Http\Request;
use App\Traits\MiscellaneousTrait;
use App\Http\Controllers\Front\RoomBookingController;
use App\Models\User\BasicSetting;
use Illuminate\Support\Facades\Session;
use App\Models\User\HotelBooking\RoomBooking;

class PerfectMoneyController extends Controller
{
    public function paymentProcess(Request $request, $_amount, $_title, $_success_url, $_cancel_url)
    {
        /*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        =============== Booking Info ==========
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $user = getUser();
        $userBs = BasicSetting::select('website_title')->where('user_id', $user->id)->first();
        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($user->id);
        $title = $_title;

        // $_amount = 0.01; //if test 
        $roomBooking = new RoomBookingController();
        $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
        $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
        $information['currency_text'] = $currencyInfo->base_currency_text;
        $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
        $information['method'] = 'Perfect Money';
        $information['type'] = 'online';

        $memo_name = $request->title == 'Room Booking' ? $request->customer_email : $request->billing_email;
        if ($request->title == 'Room Booking') {
            $_cancel_url = route('front.user.room_booking.cancel', getParam());
        }
        Session::put('user_request', $request->all());
        Session::put('user_amount', $_amount);

        /*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ============== Payment info =================
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $paymentMethod = UserPaymentGeteway::where('keyword', 'perfect_money')->first();
        $paydata = $paymentMethod->convertAutoData();
        $notify_url = $_success_url;
        $randomNo = substr(uniqid(), 0, 8);

        $val['PAYEE_ACCOUNT'] = $paydata['perfect_money_wallet_id'];;
        $val['PAYEE_NAME'] = $userBs->website_title;
        $val['PAYMENT_ID'] = "$randomNo"; //random id
        $val['PAYMENT_AMOUNT'] = $_amount;
        $val['PAYMENT_UNITS'] = "$currencyInfo->base_currency_text";

        $val['STATUS_URL'] = $_success_url;
        $val['PAYMENT_URL'] = $_success_url;
        $val['PAYMENT_URL_METHOD'] = 'GET';
        $val['NOPAYMENT_URL'] = $_cancel_url;
        $val['NOPAYMENT_URL_METHOD'] = 'GET';
        $val['SUGGESTED_MEMO'] = "$memo_name";
        $val['BAGGAGE_FIELDS'] = 'IDENT';

        $data['val'] = $val;
        $data['method'] = 'post';
        $data['url'] = 'https://perfectmoney.com/api/step1.asp';

        Session::put('payment_id', $randomNo);
        Session::put('cancel_url', $_cancel_url);
        Session::put('amount', $_amount);
        return view('payments.perfect-money', compact('data'));
    }

    public function successPayment(Request $request)
    {
        $requestData = Session::get('user_request');
        $keywords = getUserKeywords();

        if (array_key_exists('title', $requestData) &&  $requestData['title'] == "Room Booking") {
            $cancel_url = route('front.user.room_booking.cancel', getParam());
        } else {
            $cancel_url = route('customer.itemcheckout.perfect_money.cancel', getParam());
        }
        $amo = $request['PAYMENT_AMOUNT'];
        $track = $request['PAYMENT_ID'];
        $id = Session::get('payment_id');
        $final_amount = Session::get('amount');
        $paymentMethod = UserPaymentGeteway::where('keyword', 'perfect_money')->first();
        $perfectMoneyInfo = $paymentMethod->convertAutoData();

        if ($request->PAYEE_ACCOUNT == $perfectMoneyInfo['perfect_money_wallet_id']  && $track == $id && $amo == round($final_amount, 2)) {
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
        }
        return redirect($cancel_url);
    }
    public function cancelPayment()
    {
        $keywords = getUserKeywords();
        session()->flash('warning', $keywords['cancel_payment'] ?? __('cancel payment'));
        return redirect()->route('front.user.checkout', getParam());
    }
}
