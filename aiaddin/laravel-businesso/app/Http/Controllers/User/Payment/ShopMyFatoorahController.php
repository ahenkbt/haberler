<?php

namespace App\Http\Controllers\User\Payment;

use App\Http\Controllers\Controller;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Http\Request;
use Basel\MyFatoorah\MyFatoorah;
use Illuminate\Support\Facades\Config;
use App\Traits\MiscellaneousTrait;
use Illuminate\Support\Facades\Session;
use App\Http\Controllers\Front\RoomBookingController;
use App\Models\User\HotelBooking\RoomBooking;

class ShopMyFatoorahController extends Controller
{
    public $myfatoorah;

    public function __construct()
    {
        if (Session::has('user_midtrans')) {
            $user = Session::get('user_midtrans');
        } else {
            $user = getUser();
        }
        $paymentMethod = UserPaymentGeteway::where([['user_id', $user->id], ['keyword', 'myfatoorah']])->first();
        $paydata = json_decode($paymentMethod->information, true);
        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($user->id);

        Config::set('myfatorah.token', $paydata['token']);
        Config::set('myfatorah.DisplayCurrencyIso', $currencyInfo->base_currency_text);
        Config::set('myfatorah.CallBackUrl', route('myfatoorah.success'));
        Config::set('myfatorah.ErrorUrl', route('myfatoorah.cancel'));
        if ($paydata['sandbox_status'] == 1) {
            $this->myfatoorah = MyFatoorah::getInstance(true);
        } else {
            $this->myfatoorah = MyFatoorah::getInstance(false);
        }
    }

    public function paymentProcess(Request $request, $_amount, $_title)
    {
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $user = getUser();
        Session::put('user_midtrans', $user);
        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($user->id);
        $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
        $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
        $information['currency_text'] = $currencyInfo->base_currency_text;
        $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
        $information['method'] = 'MyFatoorah';
        $information['type'] = 'online';
        $title = $_title;
        Session::put('user_request', $request->all());
        Session::put('user_amount', $_amount);
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase End ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

        // if title exists in request then identify as a room booking request
        if (array_key_exists('title', $request->all()) &&  $request['title'] == "Room Booking") {
            $cancel_url = route('front.user.room_booking.cancel', getParam());
            Session::put('myfatoorah_cancel_url', $cancel_url);
            Session::put('myfatoorah_success_url', route('customer.success.page', [getParam(), 'room-booking']));
            $name = $request->customer_name;
            $phone = $request->customer_phone;
        } else {
            $cancel_url = route('customer.itemcheckout.perfect_money.cancel', getParam());
            Session::put('myfatoorah_cancel_url', $cancel_url);
            Session::put('myfatoorah_success_url', route('customer.success.page', [getParam()]));

            $name = $request->billing_fname . ' ' . $request->billing_lname;
            $phone = $request->billing_number;
        }

        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Payment Gateway Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $paymentMethod = UserPaymentGeteway::where([['user_id', $user->id], ['keyword', 'myfatoorah']])->first();
        $paydata = $paymentMethod->convertAutoData();
        $random_1 = rand(999, 9999);
        $random_2 = rand(9999, 99999);

        // create a payment request
        $result = $this->myfatoorah->sendPayment(
            $name,
            $_amount,
            [
                'CustomerMobile' => $paydata['sandbox_status'] == 1 ? '56562123544' : $phone,
                'CustomerReference' => "$random_1",  //orderID
                'UserDefinedField' => "$random_2", //clientID
                "InvoiceItems" => [
                    [
                        "ItemName" => "Product Purchase or Room Booking",
                        "Quantity" => 1,
                        "UnitPrice" => $_amount
                    ]
                ]
            ]
        );

        if ($result && $result['IsSuccess'] == true) {
            $request->session()->put('myfatoorah_payment_type', 'shop_room');
            // redirect to payment page for accept customer payment
            return redirect($result['Data']['InvoiceURL']);
        } else {
            // if fail then redirect 
            return redirect($cancel_url);
        }
    }

    // return to success page
    public function successPayment(Request $request)
    {
        $requestData = Session::get('user_request');
 

        if (!empty($request->paymentId)) {
            $result = $this->myfatoorah->getPaymentStatus('paymentId', $request->paymentId);
            if ($result && $result['IsSuccess'] == true && $result['Data']['InvoiceStatus'] == "Paid") {
                if (array_key_exists('title', $requestData) && $requestData['title'] == "Room Booking") {

                    $bookingId = $request->session()->get('bookingId');
                    $bookingInfo = RoomBooking::findOrFail($bookingId);

                    $bookingInfo->payment_status = 1;
                    $bookingInfo->save();
                    $roomBooking = new RoomBookingController();

                    // generate an invoice in pdf format
                    $invoice = $roomBooking->generateInvoice($bookingInfo);

                    // update the invoice field information in database
                    $bookingInfo->invoice = $invoice;
                    $bookingInfo->save();

                    // send a mail to the customer with an invoice
                    $roomBooking->sendMail($bookingInfo);
                    Session::forget('bookingId');
                    return [
                        'status' => 'success'
                    ];
                } else {
                    $order = $this->saveOrder($requestData, $request->paymentId, $request->Id, 'Completed');
                    $order_id = $order->id;
                    $this->saveOrderedItems($order_id);
                    $this->sendMails($order);
                    return [
                        'status' => 'success'
                    ];
                }
            } else {
                return [
                    'status' => 'fail'
                ];
            }
        }
    }
}
