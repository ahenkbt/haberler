<?php

namespace App\Http\Controllers\User\DonationManagement\Payment;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
use App\Http\Controllers\Front\DonationManagement\DonationController;
use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PaystackController extends Controller
{
    use MiscellaneousTrait;
    private $api_key;

    public function __construct()
    {
        $user = getUser();
        $data = UserPaymentGeteway::query()
            ->where('keyword', 'paystack')
            ->where('user_id', $user->id)
            ->first();
        $paystackData = json_decode($data->information, true);

        $this->api_key = $paystackData['key'];
    }

    public function donationProcess(Request $request, $causeId, $userId)
    {

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);
        $keywords = getUserKeywords();

        // checking whether the currency is set to 'NGN' or not
        if ($currencyInfo->base_currency_text !== 'NGN') {
            return redirect()->back()->with('error', $keywords['Invalid_currency'] ??'Invalid currency for paystack payment.')->withInput();
        }
        $email = empty($request["checkbox"]) ? $request["email"] : $request["paystack_email"];
        $arrData = array(
            'causeId' => $causeId,
            'name' => empty($request["checkbox"]) ? $request["name"] : "anonymous",
            'email' => empty($request["checkbox"]) ? $request["email"] : "anoymous",
            'phone' => $email,
            'amount' => $request->amount,
            'currencyText' => $currencyInfo->base_currency_text,
            'currencyTextPosition' => $currencyInfo->base_currency_text_position,
            'currencySymbol' => $currencyInfo->base_currency_symbol,
            'currencySymbolPosition' => $currencyInfo->base_currency_symbol_position,
            'paymentMethod' => 'Paystack',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );

        $notifyURL = route('cause_donate.paystack.notify', getParam());

        $curl = curl_init();

        curl_setopt_array($curl, array(
            CURLOPT_URL            => 'https://api.paystack.co/transaction/initialize',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => 'POST',
            CURLOPT_POSTFIELDS     => json_encode([
                'amount'       => intval($request->amount) * 100,
                'email'        => $email,
                'callback_url' => $notifyURL
            ]),
            CURLOPT_HTTPHEADER     => [
                'authorization: Bearer ' . $this->api_key,
                'content-type: application/json',
                'cache-control: no-cache'
            ]
        ));

        $response = curl_exec($curl);

        curl_close($curl);

        $transaction = json_decode($response, true);

        // put some data in session before redirect to paystack url
        $request->session()->put('userId', $userId);
        $request->session()->put('causeId', $causeId);
        $request->session()->put('arrData', $arrData);

        if ($transaction['status'] == true) {
            return redirect($transaction['data']['authorization_url']);
        } else {
            return redirect()->back()->with('error', 'Error: ' . $transaction['message'])->withInput();
        }
    }

    public function notify(Request $request)
    {
        // get the information from session
        $userId = $request->session()->get('userId');
        $causeId = $request->session()->get('causeId');
        $arrData = $request->session()->get('arrData');

        $urlInfo = $request->all();

        if ($urlInfo['trxref'] === $urlInfo['reference']) {
            $cause = new DonationController();

            // store the course enrolment information in database
            $donationDetails = $cause->store($arrData, $userId);

            // generate an invoice in pdf format
            $invoice = $cause->generateInvoice($donationDetails,  $userId);

            // then, update the invoice field info in database
            $donationDetails->update(['invoice' => $invoice]);

            if ($donationDetails->email) {
                // send a mail to the customer with the invoice
                $cause->sendMail($donationDetails, $userId);
            }
            // remove all session data
            $request->session()->forget('userId');
            $request->session()->forget('courseId');
            $request->session()->forget('arrData');

            return redirect()->route('front.user.cause_donate.complete', [getParam(), 'donation']);
        } else {
            // remove all session data
            $request->session()->forget('userId');
            $request->session()->forget('courseId');
            $request->session()->forget('arrData');

            return redirect()->route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
        }
    }
}
