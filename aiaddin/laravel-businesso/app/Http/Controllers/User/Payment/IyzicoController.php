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

class IyzicoController extends Controller
{
    public function paymentProcess(Request $request, $_amount, $_title, $_success_url)
    {
        $user_request = $request->all();
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $user = getUser();
        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($user->id);
        $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
        $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
        $information['currency_text'] = $currencyInfo->base_currency_text;
        $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
        $information['method'] = 'Iyzico';
        $information['type'] = 'online';
        $title = $_title;
        $roomBooking = new RoomBookingController();
        $conversion_id = uniqid(9999, 999999);

        if ($title == "Room Booking") {
            $information['conversation_id'] = $conversion_id;
            // store the room booking information in database
            $booking_details = $roomBooking->storeData($request, $information);
            Session::put('bookingId', $booking_details->id);
            $first_name = $user_request['customer_name'];
            $last_name = $user_request['customer_name'];
            $email = $user_request['customer_email'];
            $address = $user_request['address'];
            $city = $user_request['city'];
            $country = $user_request['country'];
            $number = $user_request['customer_phone'];
        } else {
            $first_name = $user_request['billing_fname'];
            $last_name = $user_request['billing_lname'];
            $email = $user_request['billing_email'];
            $address = $user_request['billing_address'];
            $city = $user_request['billing_city'];
            $country = $user_request['billing_country'];
            $number = $request['shpping_number'];
        }
        $zip_code = $user_request['zip_code'];
        $identity_number = $user_request['identity_number'];
        $basket_id = 'B' . uniqid(999, 99999);
        Session::put('user_request', $user_request);
        Session::put('user_amount', $_amount);
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase End ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Payment Gateway Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

        $paymentMethod = UserPaymentGeteway::where([['user_id', $user->id], ['keyword', 'iyzico']])->first();
        $paydata = json_decode($paymentMethod->information, true);
        $options = new \Iyzipay\Options();
        $options->setApiKey($paydata['api_key']);
        $options->setSecretKey($paydata['secret_key']);
        if ($paydata['sandbox_status'] == 1) {
            $options->setBaseUrl("https://sandbox-api.iyzipay.com");
        } else {
            $options->setBaseUrl("https://api.iyzipay.com"); // production mode
        }
        # create request class
        $request = new \Iyzipay\Request\CreatePayWithIyzicoInitializeRequest();
        $request->setLocale(\Iyzipay\Model\Locale::EN);
        $request->setConversationId($conversion_id);
        $request->setPrice($_amount);
        $request->setPaidPrice($_amount);
        $request->setCurrency(\Iyzipay\Model\Currency::TL);
        $request->setBasketId($basket_id);
        $request->setPaymentGroup(\Iyzipay\Model\PaymentGroup::PRODUCT);
        $request->setCallbackUrl($_success_url);
        $request->setEnabledInstallments(array(2, 3, 6, 9));

        $buyer = new \Iyzipay\Model\Buyer();
        $buyer->setId(uniqid());
        $buyer->setName($first_name);
        $buyer->setSurname($last_name);
        $buyer->setGsmNumber($number);
        $buyer->setEmail($email);
        $buyer->setIdentityNumber($identity_number);
        $buyer->setLastLoginDate("");
        $buyer->setRegistrationDate("");
        $buyer->setRegistrationAddress($address);
        $buyer->setIp("");
        $buyer->setCity($city);
        $buyer->setCountry($country);
        $buyer->setZipCode($zip_code);
        $request->setBuyer($buyer);

        $shippingAddress = new \Iyzipay\Model\Address();
        $shippingAddress->setContactName($first_name);
        $shippingAddress->setCity($city);
        $shippingAddress->setCountry($country);
        $shippingAddress->setAddress($address);
        $shippingAddress->setZipCode($zip_code);
        $request->setShippingAddress($shippingAddress);

        $billingAddress = new \Iyzipay\Model\Address();
        $billingAddress->setContactName($first_name);
        $billingAddress->setCity($city);
        $billingAddress->setCountry($country);
        $billingAddress->setAddress($address);
        $billingAddress->setZipCode($zip_code);
        $request->setBillingAddress($billingAddress);

        $q_id = uniqid(999, 99999);
        $basketItems = array();
        $firstBasketItem = new \Iyzipay\Model\BasketItem();
        $firstBasketItem->setId($q_id);
        $firstBasketItem->setName("Purchase Id " . $q_id);
        $firstBasketItem->setCategory1("Purchase or Booking");
        $firstBasketItem->setCategory2("");
        $firstBasketItem->setItemType(\Iyzipay\Model\BasketItemType::PHYSICAL);
        $firstBasketItem->setPrice($_amount);
        $basketItems[0] = $firstBasketItem;

        $request->setBasketItems($basketItems);

        # make request
        $payWithIyzicoInitialize = \Iyzipay\Model\PayWithIyzicoInitialize::create($request, $options);

        $paymentResponse = (array)$payWithIyzicoInitialize;
        foreach ($paymentResponse as $key => $data) {
            $paymentInfo = json_decode($data, true);
            if ($paymentInfo['status'] == 'success') {
                if (!empty($paymentInfo['payWithIyzicoPageUrl'])) {
                    Session::put('conversation_id', $conversion_id);
                    return redirect($paymentInfo['payWithIyzicoPageUrl']);
                }
            }
            if (array_key_exists('title', $user_request) &&  $request['title'] == "Room Booking") {
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
        $keywords = getUserKeywords();
        $requestData = Session::get('user_request');
        if (!empty($requestData)) {
            $txnId = Session::get('conversation_id');
            $chargeId = Session::get('conversation_id');

            if (array_key_exists('title', $requestData) && $requestData['title'] == "Room Booking") {

                $bookingId = $request->session()->get('bookingId');
                $bookingInfo = RoomBooking::findOrFail($bookingId);
                $roomBooking = new RoomBookingController();

                // generate an invoice in pdf format
                $invoice = $roomBooking->generateInvoice($bookingInfo);

                // update the invoice field information in database
                $bookingInfo->update(['invoice' => $invoice]);

                // send a mail to the customer with an invoice
                $roomBooking->sendMail($bookingInfo);
                Session::forget('bookingId');
            } else {


                $order = $this->saveOrder($requestData, $txnId, $chargeId, 'Pending');
                $order_id = $order->id;
                $this->saveOrderedItems($order_id);
                $this->sendMails($order);
            }
            session()->flash('success', $keywords['successful_payment'] ?? __('successful payment'));
            Session::forget('user_request');
            Session::forget('user_amount');
            Session::forget('conversation_id');
            if (array_key_exists('title', $requestData) && $requestData['title'] == "Room Booking") {
                return redirect()->route('customer.success.page', [getParam(), 'room-booking']);
            }
            return redirect()->route('customer.success.page', [getParam()]);
        }
    }
}
