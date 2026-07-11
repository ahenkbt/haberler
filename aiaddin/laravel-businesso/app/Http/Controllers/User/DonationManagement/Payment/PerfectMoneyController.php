<?php

namespace App\Http\Controllers\User\DonationManagement\Payment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Http\Controllers\Front\DonationManagement\DonationController;
use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;
use App\Models\User\BasicSetting;
use Illuminate\Support\Facades\Session;

class PerfectMoneyController extends Controller
{
    use MiscellaneousTrait;
    public function donationProcess(Request $request, $causeId, $userId)
    {
        $user = getUser();
        $keywords = getUserKeywords();

        $enrol = new DonationController();

        // do calculation
        $amount = $request->amount;

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);

        // checking whether the base currency is allowed or not
        if ($currencyInfo->base_currency_text != 'USD') {
            return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for phonepe payment.');
        }

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
            'paymentMethod' => 'Perfect Money',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );


        $title = 'Given Donation';
        $notifyURL = route('cause_donation.perfect_money.notify', getParam());
        $cancelURL = route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);

        $data = UserPaymentGeteway::query()
            ->where('keyword', 'perfect_money')
            ->where('user_id', $user->id)
            ->first();
        $paydata = json_decode($data->information, true);
        $random_id = rand(111, 999);

        /*---------------------------------------
        ========= Payment gatewyay ===============
        ----------------------------------------*/
        $user = getUser();
        $userBs = BasicSetting::select('website_title')->where('user_id', $user->id)->first();
        $randomNo = substr(uniqid(), 0, 8);

        $val['PAYEE_ACCOUNT'] = $paydata['perfect_money_wallet_id'];;
        $val['PAYEE_NAME'] = $userBs->website_title;
        $val['PAYMENT_ID'] = "$randomNo"; //random id
        $val['PAYMENT_AMOUNT'] = $amount;
        // $val['PAYMENT_AMOUNT'] = 0.01; //test amount
        $val['PAYMENT_UNITS'] = "$currencyInfo->base_currency_text";

        $val['STATUS_URL'] = $notifyURL;
        $val['PAYMENT_URL'] = $notifyURL;
        $val['PAYMENT_URL_METHOD'] = 'GET';
        $val['NOPAYMENT_URL'] = $cancelURL;
        $val['NOPAYMENT_URL_METHOD'] = 'GET';
        $val['SUGGESTED_MEMO'] = empty($request["checkbox"]) ? $request["email"] : "anoymous";
        $val['BAGGAGE_FIELDS'] = 'IDENT';

        $data['val'] = $val;
        $data['method'] = 'post';
        $data['url'] = 'https://perfectmoney.com/api/step1.asp';

        // put some data in session before redirect to paypal url
        Session::put('payment_id', $randomNo);
        Session::put('cancel_url', $cancelURL);
        Session::put('amount', $amount);
        // Session::put('amount', 0.01); //test amount

        // put some data in session before redirect to paypal url
        $request->session()->put('causeId', $causeId);
        $request->session()->put('userId', $userId);
        $request->session()->put('arrData', $arrData);
        return view('payments.perfect-money', compact('data'));
    }

    public function notify(Request $request)
    {
        // get the information from session
        $causeId = $request->session()->get('causeId');
        $userId = $request->session()->get('userId');
        $arrData = $request->session()->get('arrData');
        $amo = $request['PAYMENT_AMOUNT'];
        $track = $request['PAYMENT_ID'];
        $id = Session::get('payment_id');
        $final_amount = Session::get('amount');
        $paymentMethod = UserPaymentGeteway::where('keyword', 'perfect_money')->first();
        $perfectMoneyInfo = $paymentMethod->convertAutoData();
        if ($request->PAYEE_ACCOUNT == $perfectMoneyInfo['perfect_money_wallet_id']  && $track == $id && $amo == round($final_amount, 2)) {
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

            Session::forget('payment_id');
            Session::forget('amount');

            return redirect()->route('front.user.cause_donate.complete', [getParam(), 'donation']);
        } else {
            // remove all session data
            $request->session()->forget('userId');
            $request->session()->forget('cause');
            $request->session()->forget('arrData');
            Session::forget('payment_id');
            Session::forget('amount');

            return redirect()->route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
        }
    }
}
