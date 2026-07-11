<?php

namespace App\Http\Controllers\User\CourseManagement\Payment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Session;

class IyzicoController extends Controller
{
    public function enrolmentProcess(Request $request, $courseId, $userId)
    {
        $profile_status =  $this->check_profile();
        if ($profile_status == 'incomplete') {
            Session::flash('warning', 'Please, Complete your billing information before payment using iyzico payment method');
            return redirect()->route('customer.billing-details', getParam());
        }
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $enrol = new EnrolmentController();

        // do calculation
        $calculatedData = $enrol->calculation($request, $courseId, $userId);

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);
        $customerInfo = Auth::guard('customer')->user();
        $notifyURL = route('course_enrolment.iyzico.notify', getParam());
        $cancelURL = route('front.user.course_enrolment.cancel', [getParam(), 'id' => $courseId]);
        if ($currencyInfo->base_currency_text != 'TRY') {
            return redirect()->back()->with('error', 'Invalid currency for iyzico payment.')->withInput();
        }
        $conversation_id = uniqid(9999, 999999);

        $arrData = array(
            'courseId' => $courseId,
            'coursePrice' => $calculatedData['coursePrice'],
            'discount' => $calculatedData['discount'],
            'grandTotal' => $calculatedData['grandTotal'],
            'currencyText' => $currencyInfo->base_currency_text,
            'currencyTextPosition' => $currencyInfo->base_currency_text_position,
            'currencySymbol' => $currencyInfo->base_currency_symbol,
            'currencySymbolPosition' => $currencyInfo->base_currency_symbol_position,
            'paymentMethod' => 'Iyzico',
            'gatewayType' => 'online',
            'paymentStatus' => 'pending',
            'conversation_id' => $conversation_id
        );
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase End ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Payment Gateway Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $first_name = $customerInfo->billing_fname;
        $last_name = $customerInfo->billing_lname;
        $email = $customerInfo->billing_email;
        $address = $customerInfo->billing_address;
        $city = $customerInfo->billing_city;
        $country = $customerInfo->billing_country;
        $phone = $customerInfo->billing_number;
        $zip_code = $request->zip_code;
        $identity_number = $request->identity_number;
        $basket_id = 'B' . uniqid(999, 99999);



        $paymentMethod = UserPaymentGeteway::where([['user_id', $userId], ['keyword', 'iyzico']])->first();
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
        $request->setConversationId($conversation_id);
        $request->setPrice($calculatedData['grandTotal']);
        $request->setPaidPrice($calculatedData['grandTotal']);
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
        $firstBasketItem->setPrice($calculatedData['grandTotal']);
        $basketItems[0] = $firstBasketItem;

        $request->setBasketItems($basketItems);

        # make request
        $payWithIyzicoInitialize = \Iyzipay\Model\PayWithIyzicoInitialize::create($request, $options);

        $paymentResponse = (array)$payWithIyzicoInitialize;
        foreach ($paymentResponse as $key => $data) {
            $paymentInfo = json_decode($data, true);
            if ($paymentInfo['status'] == 'success') {
                if (!empty($paymentInfo['payWithIyzicoPageUrl'])) {
                    Session::put('conversation_id', $conversation_id);
                    // put some data in session before redirect to xendit url
                    Session::put('courseId', $courseId);
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
        $courseId = $request->session()->get('courseId');
        $userId = $request->session()->get('userId');
        $arrData = $request->session()->get('arrData');

        $enrol = new EnrolmentController();

        // store the course enrolment information in database
        $enrolmentInfo = $enrol->storeData($arrData, $userId);

        // generate an invoice in pdf format
        $invoice = $enrol->generateInvoice($enrolmentInfo, $courseId, $userId);

        // then, update the invoice field info in database
        $enrolmentInfo->update(['invoice' => $invoice]);

        // send a mail to the customer with the invoice
        $enrol->sendMail($enrolmentInfo, $userId);

        // remove all session data
        $request->session()->forget('userId');
        $request->session()->forget('courseId');
        $request->session()->forget('arrData');

        return redirect()->route('front.user.course_enrolment.complete', [getParam(), 'id' => $courseId]);
    }

    private function check_profile()
    {
        $customerInfo = Auth::guard('customer')->user();
        if ($customerInfo) {
            if (empty($customerInfo->billing_fname) || empty($customerInfo->billing_email) || empty($customerInfo->billing_city) || empty($customerInfo->billing_country) || empty($customerInfo->billing_address) || empty($customerInfo->billing_number)) {
                return 'incomplete';
            } else {
                return 'completed';
            }
        } else {
            return 'incomplete';
        }
    }
}
