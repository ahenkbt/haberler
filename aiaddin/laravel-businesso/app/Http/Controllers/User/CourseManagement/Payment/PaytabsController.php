<?php

namespace App\Http\Controllers\User\CourseManagement\Payment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
use App\Traits\MiscellaneousTrait;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;

class PaytabsController extends Controller
{
    public function enrolmentProcess(Request $request, $courseId, $userId)
    {
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $enrol = new EnrolmentController();
        $user = getUser();

        // do calculation
        $calculatedData = $enrol->calculation($request, $courseId, $userId);

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);
        $notifyURL = route('course_enrolment.paytabs.notify', getParam());
        $cancelURL = route('front.user.course_enrolment.cancel', [getParam(), 'id' => $courseId]);
        $paytabInfo = paytabInfo('user', $user->id);
        if ($currencyInfo->base_currency_text != $paytabInfo['currency']) {
            return redirect()->back()->with('error', 'Invalid currency for paytabs payment.')->withInput();
        }

        $arrData = array(
            'courseId' => $courseId,
            'coursePrice' => $calculatedData['coursePrice'],
            'discount' => $calculatedData['discount'],
            'grandTotal' => $calculatedData['grandTotal'],
            'currencyText' => $currencyInfo->base_currency_text,
            'currencyTextPosition' => $currencyInfo->base_currency_text_position,
            'currencySymbol' => $currencyInfo->base_currency_symbol,
            'currencySymbolPosition' => $currencyInfo->base_currency_symbol_position,
            'paymentMethod' => 'Paytabs',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase End ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Payment Gateway Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

        $paytabInfo = paytabInfo('user', $user->id);
        $description = 'Course enrolment via paytabs';
        try {
            $response = Http::withHeaders([
                'Authorization' => $paytabInfo['server_key'], // Server Key
                'Content-Type' => 'application/json',
            ])->post(
                $paytabInfo['url'],
                [
                    'profile_id' => $paytabInfo['profile_id'], // Profile ID
                    'tran_type' => 'sale',
                    'tran_class' => 'ecom',
                    'cart_id' => uniqid(),
                    'cart_description' => $description,
                    'cart_currency' => $paytabInfo['currency'], // set currency by region
                    'cart_amount' => round($calculatedData['grandTotal'], 2),
                    'return' => $notifyURL,
                ]
            );

            $responseData = $response->json();
            // put some data in session before redirect to paytabs url 
            $request->session()->put('courseId', $courseId);
            $request->session()->put('userId', $userId);
            $request->session()->put('arrData', $arrData);

            return redirect()->to($responseData['redirect_url']);
        } catch (\Exception $e) {
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

        $resp = $request->all();
        if ($resp['respStatus'] == "A" && $resp['respMessage'] == 'Authorised') {
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
        } else {
            // remove all session data
            $request->session()->forget('userId');
            $request->session()->forget('courseId');
            $request->session()->forget('arrData');

            return redirect()->route('front.user.course_enrolment.cancel', [getParam(), 'id' => $courseId]);
        }
    }
}
