<?php

namespace App\Http\Controllers\User\Payment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Traits\MiscellaneousTrait;
use App\Http\Controllers\Front\RoomBookingController;
use App\Models\User\HotelBooking\RoomBooking;
use Illuminate\Support\Facades\Session;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Support\Facades\Http;

class ToyyibpayController extends Controller
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
        $information['method'] = 'Toyyibpay';
        $information['type'] = 'online';
        $title = $_title;
        $roomBooking = new RoomBookingController();

        if (array_key_exists('title', $request->all()) &&  $request['title'] == "Room Booking") {
            $bill_title = 'Room Booking';
            $bill_description = 'Room Booking via toyyibpay';
            $name = $request->customer_name;
            $customer_email = $request->customer_email;
            $customer_phone = $request->customer_phone;
        } else {
            $bill_title = 'Product Purchase';
            $bill_description = 'Product Purchase via toyyibpay';
            $name = $request->billing_fname . ' ' . $request->billing_lname;
            $customer_email = $request->billing_email;
            $customer_phone = $request->billing_number;
        }
        Session::put('user_request', $request->all());
        Session::put('user_amount', $_amount);
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase End ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Payment Gateway Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $paymentMethod = UserPaymentGeteway::where([['user_id', $user->id], ['keyword', 'toyyibpay']])->first();
        $paydata = json_decode($paymentMethod->information, true);
        $ref = uniqid();
        session()->put('toyyibpay_ref_id', $ref);


        $some_data = array(
            'userSecretKey' => $paydata['secret_key'],
            'categoryCode' => $paydata['category_code'],
            'billName' => $bill_title,
            'billDescription' => $bill_description,
            'billPriceSetting' => 1,
            'billPayorInfo' => 1,
            'billAmount' => $_amount * 100,
            'billReturnUrl' => $_success_url,
            'billExternalReferenceNo' => $ref,
            'billTo' => $name,
            'billEmail' => $customer_email,
            'billPhone' => $customer_phone,
        );

        if ($paydata['sandbox_status'] == 1) {
            $host = 'https://dev.toyyibpay.com/'; // for development environment
        } else {
            $host = 'https://toyyibpay.com/'; // for production environment
        }

        $curl = curl_init();
        curl_setopt($curl, CURLOPT_POST, 1);
        curl_setopt($curl, CURLOPT_URL, $host . 'index.php/api/createBill');  // sandbox will be dev.
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_POSTFIELDS, $some_data);

        $result = curl_exec($curl);
        $info = curl_getinfo($curl);
        curl_close($curl);
        $response = json_decode($result, true);
        if (!empty($response[0])) {
            return redirect($host . $response[0]["BillCode"]);
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

        if (array_key_exists('title', $requestData) &&  $requestData['title'] == "Room Booking") {
            $cancel_url = route('front.user.room_booking.cancel', getParam());
        } else {
            $cancel_url = route('customer.itemcheckout.perfect_money.cancel', getParam());
        }


        $user = getUser();
        $keywords = getUserKeywords();

        $ref = session()->get('toyyibpay_ref_id');
        if ($request['status_id'] == 1 && $request['order_id'] == $ref) {
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
            session()->flash('warning', $keywords['cancel_payment'] ?? __('cancel payment'));
            return redirect($cancel_url);
        }
    }
}
