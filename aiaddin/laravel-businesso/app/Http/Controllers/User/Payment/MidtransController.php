<?php

namespace App\Http\Controllers\User\Payment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Traits\MiscellaneousTrait;
use App\Http\Controllers\Front\RoomBookingController;
use App\Models\User\HotelBooking\RoomBooking;
use Illuminate\Support\Facades\Session;
use App\Models\User\UserPaymentGeteway;
use Midtrans\Snap;
use Midtrans\Config as MidtransConfig;

class MidtransController extends Controller
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
        $information['method'] = 'Midtrans';
        $information['type'] = 'online';
        $title = $_title;
        $roomBooking = new RoomBookingController();

        $data = [];
        if ($title == "Room Booking") {
            $cancel_url = route('front.user.room_booking.cancel', getParam());
            $name = $request->billing_fname . ' ' . $request->billing_lname;
            $phone = $request->billing_number;
            $email = $request->billing_email;
            $data['title'] = "Room Booking via midtrans";
            $midtrans_success_url = route('customer.success.page', [getParam(), 'room-booking']);
        } else {
            $cancel_url = route('customer.itemcheckout.perfect_money.cancel', getParam());
            $name = $request->billing_fname . ' ' . $request->billing_lname;
            $phone = $request->billing_number;
            $email = $request->billing_email;
            $data['title'] = "Product Purchase via midtrans";
            $midtrans_success_url = route('customer.success.page', [getParam()]);
        }
        Session::put('user_request', $request->all());
        Session::put('user_amount', $_amount);
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase End ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Payment Gateway Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $paymentMethod = UserPaymentGeteway::where([['user_id', $user->id], ['keyword', 'midtrans']])->first();
        $paydata = $paymentMethod->convertAutoData();
        // will come from database
        MidtransConfig::$serverKey = $paydata['server_key'];
        MidtransConfig::$isProduction = $paydata['is_production'] == 0 ? true : false;
        MidtransConfig::$isSanitized = true;
        MidtransConfig::$is3ds = true;
        $token = uniqid();
        Session::put('token', $token);
        $params = [
            'transaction_details' => [
                'order_id' => $token,
                'gross_amount' => $_amount * 1000, // will be multiplied by 1000
            ],
            'customer_details' => [
                'first_name' => $name,
                'email' => $email,
                'phone' => $phone,
            ],
        ];

        $snapToken = Snap::getSnapToken($params);

        // put some data in session before redirect to midtrans url
        if (
            $paydata['is_production'] == 1
        ) {
            $is_production = $paydata['is_production'];
        }
        $data['snapToken'] = $snapToken;
        $data['is_production'] = $is_production;
        $data['success_url'] = $_success_url;
        $data['_cancel_url'] = $cancel_url;
        $data['client_key'] = $paydata['server_key'];

        //put data into session for midtrans bank notify
        Session::put('user_midtrans', $user);
        Session::put('midtrans_payment_type', 'shop_room');
        Session::put('midtrans_cancel_url', $cancel_url);
        Session::put('midtrans_success_url', $midtrans_success_url);
        //dummy url set to session
        Session::put('order_details_url', route('customer.orders-details', ['id' => 1, getParam()]));
        return view('payments.midtrans-membership', $data);
    }

    // return to success page
    public function successPayment(Request $request)
    {
        $requestData = Session::get('user_request');
        $keywords = getUserKeywords();

        $token = Session::get('token');
        if ($request->status_code == 200 && $token == $request->order_id) {
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
            Session::forget('user_midtrans');
            Session::forget('midtrans_payment_type');
            Session::forget('order_details_url');
            Session::forget('midtrans_cancel_url');
            Session::forget('midtrans_success_url');
            if (array_key_exists('title', $requestData) && $requestData['title'] == "Room Booking") {
                return redirect()->route('customer.success.page', [getParam(), 'room-booking']);
            }
            return redirect()->route('customer.success.page', [getParam()]);
        } else {
            session()->flash('warning', $keywords['cancel_payment'] ?? __('cancel payment'));
            return redirect(Session::get('midtrans_cancel_url'));
        }
    }
}
