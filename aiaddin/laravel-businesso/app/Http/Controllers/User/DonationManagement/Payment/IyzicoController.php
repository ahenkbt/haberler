<?php

namespace App\Http\Controllers\User\DonationManagement\Payment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Traits\MiscellaneousTrait;
use App\Http\Controllers\Front\DonationManagement\DonationController;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Session;

class IyzicoController extends Controller
{
    use MiscellaneousTrait;
    public function donationProcess(Request $request, $causeId, $userId)
    {
        $enrol = new DonationController();
        $keywords = getUserKeywords();

        // do calculation
        $amount = $request->amount;

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);

        // checking whether the base currency is allowed or not 
        if ($currencyInfo->base_currency_text != 'TRY') {
            return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for iyzico payment.');
        }
        $conversion_id = uniqid(9999, 999999);

        $arrData = array(
            'name' => empty($request["checkbox"]) ? $request["name"] : "anonymous",
            'email' => empty($request["checkbox"]) ? $request["email"] : "anoymous",
            'phone' => empty($request["checkbox"]) ? $request["phone"] : "anoymous",
            'causeId' => $causeId,
            'amount' => $amount,
            'currencyText' => $currencyInfo->base_currency_text,
            'currencyTextPosition' => $currencyInfo->base_currency_text_position,
            'currencySymbol' => $currencyInfo->base_currency_symbol,
            'currencySymbolPosition' => $currencyInfo->base_currency_symbol_position,
            'paymentMethod' => 'Iyzico',
            'gatewayType' => 'online',
            'paymentStatus' => 'pending',
            'conversation_id' => $conversion_id
        );
        $user = getUser();
        $notifyURL = route('cause_donation.iyzico.notify', getParam());
        $cancelURL = route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase End ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Payment Gateway Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

        $first_name =  $request["name"];
        $last_name = $request["name"];
        $email = $request["email"];
        $phone = $request["phone"];
        $identity_number = $request['identity_number'];
        $city = $request['city'];
        $country = $request['country'];
        $zip_code = $request['zip_code'];
        $address = $request['address'];
        $basket_id = 'B' . uniqid(999, 99999);

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
        $request->setPrice($amount);
        $request->setPaidPrice($amount);
        $request->setCurrency(\Iyzipay\Model\Currency::TL);
        $request->setBasketId($basket_id);
        $request->setPaymentGroup(\Iyzipay\Model\PaymentGroup::PRODUCT);
        $request->setCallbackUrl($notifyURL);
        $request->setEnabledInstallments(array(2, 3, 6, 9));

        $buyer = new \Iyzipay\Model\Buyer();
        $buyer->setId(uniqid());
        $buyer->setName($first_name);
        $buyer->setSurname($last_name);
        $buyer->setGsmNumber($phone);
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
        $firstBasketItem->setName("Course Id " . $q_id);
        $firstBasketItem->setCategory1("Course Enrolment");
        $firstBasketItem->setCategory2("");
        $firstBasketItem->setItemType(\Iyzipay\Model\BasketItemType::PHYSICAL);
        $firstBasketItem->setPrice($amount);
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
                    // put some data in session before redirect to xendit url
                    // put some data in session before redirect to yoco url 
                    Session::put('causeId', $causeId);
                    Session::put('userId', $userId);
                    Session::put('arrData', $arrData);
                    return redirect($paymentInfo['payWithIyzicoPageUrl']);
                }
            }
            return redirect($cancelURL);
        }
    }

    // return to success page
    public function notify(Request $request)
    {
        // get the information from session
        $causeId = $request->session()->get('causeId');
        $userId = $request->session()->get('userId');
        $arrData = $request->session()->get('arrData');

        $donate = new DonationController();

        // store the course enrolment information in database
        $donationDetails = $donate->store($arrData, $userId);
        // generate an invoice in pdf format
        $invoice = $donate->generateInvoice($donationDetails, $userId);

        // then, update the invoice field info in database
        $donationDetails->update(['invoice' => $invoice]);
        if ($donationDetails->email) {
            // dd($donationDetails);
            // send a mail to the customer with the invoice
            $donate->sendMail($donationDetails, $userId);
        }

        // remove all session data
        $request->session()->forget('userId');
        $request->session()->forget('cause');
        $request->session()->forget('arrData');

        return redirect()->route('front.user.cause_donate.complete', [getParam(), 'donation']);
    }
}
