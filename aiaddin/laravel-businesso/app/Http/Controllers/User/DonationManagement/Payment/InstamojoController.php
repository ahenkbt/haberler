<?php

namespace App\Http\Controllers\User\DonationManagement\Payment;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\DonationManagement\DonationController;
use App\Http\Helpers\Instamojo;
use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class InstamojoController extends Controller
{
    use MiscellaneousTrait;
    private $api;

    public function __construct()
    {
        $user = getUser();
        $data = UserPaymentGeteway::query()
            ->where('keyword', 'instamojo')
            ->where('user_id', $user->id)
            ->first();
        $instamojoData = json_decode($data->information, true);
        // dd($instamojoData);
        if ($instamojoData['sandbox_check'] == 1) {
            $this->api = new Instamojo($instamojoData['key'], $instamojoData['token'], 'https://test.instamojo.com/api/1.1/');
        } else {
            $this->api = new Instamojo($instamojoData['key'], $instamojoData['token']);
        }
    }

    public function donationProcess(Request $request, $causeId, $userId)
    {

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);
        $keywords = getUserKeywords();

        // checking whether the currency is set to 'INR' or not
        if ($currencyInfo->base_currency_text !== 'INR') {
            return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for instamojo payment.')->withInput();
        }
        $amount = $request['amount'];

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
            'paymentMethod' => 'Instamojo',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );

        $title = 'Given Donation';
        $notifyURL = route('cause_donate.instamojo.notify', getParam());

        try {
            $response = $this->api->paymentRequestCreate(array(
                'purpose' => $title,
                'amount' => $amount,
                'send_email' => false,
                'email' => null,
                'redirect_url' => $notifyURL
            ));

            // // put some data in session before redirect to instamojo url
            $request->session()->put('userId', $userId);
            $request->session()->put('courseId', $causeId);
            $request->session()->put('arrData', $arrData);
            $request->session()->put('paymentId', $response['id']);

            return redirect($response['longurl']);
        } catch (Exception $e) {
            return redirect()->back()->with('error', $e)->withInput();
        }
    }

    public function notify(Request $request)
    {
        // get the information from session
        $userId = $request->session()->get('userId');
        $causeId = $request->session()->get('causeId');
        $arrData = $request->session()->get('arrData');
        $paymentId = $request->session()->get('paymentId');

        $urlInfo = $request->all();

        if ($urlInfo['payment_request_id'] == $paymentId) {
            $enrol = new DonationController();

            // store the course enrolment information in database
            $donationInfo = $enrol->store($arrData, $userId);

            // generate an invoice in pdf format
            $invoice = $enrol->generateInvoice($donationInfo,  $userId);

            // then, update the invoice field info in database
            $donationInfo->update(['invoice' => $invoice]);
            // send a mail to the customer with the invoice
            if ($donationInfo->email) {
                $enrol->sendMail($donationInfo, $userId);
            }
            // remove all session data
            $request->session()->forget('userId');
            $request->session()->forget('causeId');
            $request->session()->forget('arrData');
            $request->session()->forget('paymentId');

            return redirect()->route('front.user.cause_donate.complete', [getParam(), 'donation']);
        } else {
            // remove all session data
            $request->session()->forget('userId');
            $request->session()->forget('courseId');
            $request->session()->forget('arrData');
            $request->session()->forget('paymentId');

            return redirect()->route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
        }
    }
}
