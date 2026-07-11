<?php

namespace App\Http\Controllers\User\CourseManagement\Payment;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Redirect;
use PayPal\Api\Amount;
use PayPal\Api\Item;
use PayPal\Api\ItemList;
use PayPal\Api\Payer;
use PayPal\Api\Payment;
use PayPal\Api\PaymentExecution;
use PayPal\Api\RedirectUrls;
use PayPal\Api\Transaction;
use PayPal\Auth\OAuthTokenCredential;
use PayPal\Exception\PPConnectionException;
use PayPal\Rest\ApiContext;

class PayPalController extends Controller
{
    use MiscellaneousTrait;
    private $api_context;

    public function __construct()
    {
        $user = getUser();
        $data = UserPaymentGeteway::query()
            ->where('keyword', 'paypal')
            ->where('user_id', $user->id)
            ->first();
        $paypalData = json_decode($data->information, true);

        $paypal_conf = Config::get('paypal');
        $paypal_conf['client_id'] = $paypalData['client_id'];
        $paypal_conf['secret'] = $paypalData['client_secret'];
        $paypal_conf['settings']['mode'] = $paypalData['sandbox_check'] == 1 ? 'sandbox' : 'live';

        $this->api_context = new ApiContext(
            new OAuthTokenCredential(
                $paypal_conf['client_id'],
                $paypal_conf['secret']
            )
        );

        $this->api_context->setConfig($paypal_conf['settings']);
    }

    public function enrolmentProcess(Request $request, $courseId, $userId)
    {
        $enrol = new EnrolmentController();

        // do calculation
        $calculatedData = $enrol->calculation($request, $courseId, $userId);

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);

        // changing the currency before redirect to PayPal
        if ($currencyInfo->base_currency_text !== 'USD') {
            $rate = floatval($currencyInfo->base_currency_rate);
            $convertedTotal = round(($calculatedData['grandTotal'] / $rate), 2);
        }

        $paypalTotal = $currencyInfo->base_currency_text === 'USD' ? $calculatedData['grandTotal'] : $convertedTotal;

        $arrData = array(
            'courseId' => $courseId,
            'coursePrice' => $calculatedData['coursePrice'],
            'discount' => $calculatedData['discount'],
            'grandTotal' => $calculatedData['grandTotal'],
            'currencyText' => $currencyInfo->base_currency_text,
            'currencyTextPosition' => $currencyInfo->base_currency_text_position,
            'currencySymbol' => $currencyInfo->base_currency_symbol,
            'currencySymbolPosition' => $currencyInfo->base_currency_symbol_position,
            'paymentMethod' => 'PayPal',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );

        $title = 'Course Enrolment';
        $notifyURL = route('course_enrolment.paypal.notify', getParam());
        $cancelURL = route('front.user.course_enrolment.cancel', [getParam(), 'id' => $courseId]);

        $payer = new Payer();
        $payer->setPaymentMethod('paypal');
        $item_1 = new Item();
        $item_1->setName($title)
            /** item name **/
            ->setCurrency('USD')
            ->setQuantity(1)
            ->setPrice($paypalTotal);
        /** unit price **/
        $item_list = new ItemList();
        $item_list->setItems(array($item_1));
        $amount = new Amount();
        $amount->setCurrency('USD')
            ->setTotal($paypalTotal);
        $transaction = new Transaction();
        $transaction->setAmount($amount)
            ->setItemList($item_list)
            ->setDescription($title . ' via PayPal');
        $redirect_urls = new RedirectUrls();
        $redirect_urls->setReturnUrl($notifyURL)
            /** Specify return URL **/
            ->setCancelUrl($cancelURL);
        $payment = new Payment();
        $payment->setIntent('Sale')
            ->setPayer($payer)
            ->setRedirectUrls($redirect_urls)
            ->setTransactions(array($transaction));

        try {
            $payment->create($this->api_context);
        } catch (PPConnectionException $ex) {
            return redirect($cancelURL)->with('error', $ex->getMessage());
        }

        foreach ($payment->getLinks() as $link) {
            if ($link->getRel() == 'approval_url') {
                $redirectURL = $link->getHref();
                break;
            }
        }

        // put some data in session before redirect to paypal url
        $request->session()->put('courseId', $courseId);
        $request->session()->put('userId', $userId);
        $request->session()->put('arrData', $arrData);
        $request->session()->put('paymentId', $payment->getId());

        if (isset($redirectURL)) {
            /** redirect to paypal **/
            return Redirect::away($redirectURL);
        }
    }

    public function notify(Request $request)
    {
        // get the information from session
        $courseId = $request->session()->get('courseId');
        $userId = $request->session()->get('userId');
        $arrData = $request->session()->get('arrData');
        $paymentId = $request->session()->get('paymentId');

        $urlInfo = $request->all();

        if (empty($urlInfo['token']) || empty($urlInfo['PayerID'])) {
            return redirect()->route('front.user.course_enrolment.cancel', [getParam(), 'id' => $courseId]);
        }

        /** Execute The Payment **/
        $payment = Payment::get($paymentId, $this->api_context);
        $execution = new PaymentExecution();
        $execution->setPayerId($urlInfo['PayerID']);
        $result = $payment->execute($execution, $this->api_context);

        if ($result->getState() == 'approved') {
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
            $request->session()->forget('paymentId');

            return redirect()->route('front.user.course_enrolment.complete', [getParam(), 'id' => $courseId]);
        } else {
            // remove all session data
            $request->session()->forget('userId');
            $request->session()->forget('courseId');
            $request->session()->forget('arrData');
            $request->session()->forget('paymentId');

            return redirect()->route('front.user.course_enrolment.cancel', [getParam(), 'id' => $courseId]);
        }
    }
}
