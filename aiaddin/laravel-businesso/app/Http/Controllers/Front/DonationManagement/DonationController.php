<?php

namespace App\Http\Controllers\Front\DonationManagement;

use App\Constants\Constant;
use App\Http\Controllers\Controller;
use App\Http\Controllers\User\DonationManagement\Payment\AuthorizenetController;
use App\Http\Controllers\User\DonationManagement\Payment\FlutterwaveController;
use App\Http\Controllers\User\DonationManagement\Payment\InstamojoController;
use App\Http\Controllers\User\DonationManagement\Payment\MercadoPagoController;
use App\Http\Controllers\User\DonationManagement\Payment\MollieController;
use App\Http\Controllers\User\DonationManagement\Payment\OfflineController;
use App\Http\Controllers\User\DonationManagement\Payment\PayPalController;
use App\Http\Controllers\User\DonationManagement\Payment\PaystackController;
use App\Http\Controllers\User\DonationManagement\Payment\PaytmController;
use App\Http\Controllers\User\DonationManagement\Payment\PhonePeController;
use App\Http\Controllers\User\DonationManagement\Payment\PerfectMoneyController;
use App\Http\Controllers\User\DonationManagement\Payment\RazorpayController;
use App\Http\Controllers\User\DonationManagement\Payment\StripeController;
use App\Http\Controllers\User\DonationManagement\Payment\XenditController;
use App\Http\Controllers\User\DonationManagement\Payment\YocoController;
use App\Http\Controllers\User\DonationManagement\Payment\ToyyibpayController;
use App\Http\Controllers\User\DonationManagement\Payment\PaytabsController;
use App\Http\Controllers\User\DonationManagement\Payment\MidtransController;
use App\Http\Controllers\User\DonationManagement\Payment\IyzicoController;
use App\Http\Controllers\User\DonationManagement\Payment\MyFatoorahController;
use App\Models\User\BasicSetting;
use App\Models\User\DonationManagement\Donation;
use App\Models\User\DonationManagement\DonationContent;
use App\Models\User\DonationManagement\DonationDetail;
use App\Models\User\UserEmailTemplate;
use App\Traits\MiscellaneousTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use PDF;
use PHPMailer\PHPMailer\PHPMailer;

class DonationController extends Controller
{
    use MiscellaneousTrait;
    public function makePayment(Request $request)
    {
        $keywords = getUserKeywords();
        $customMessages = [
            'gateway.required' => $keywords['select_payment_gateway'] ?? 'Please choose a payment method.',
            'name.required' => $keywords['name_required'] ?? 'The name field is required for iyzico payments.',
            'phone.required' => $keywords['phone_required_for_iyzico'] ?? 'The phone field is required for iyzico payments.',
            'email.required' => $keywords['email'] ?? 'The email field is required for iyzico payments.',
            'identity_number.required' => $keywords['identity_number_required'] ?? 'The identity number field is required for iyzico payments.',
            'city.required' => $keywords['city_required_for_iyzico'] ?? 'The city field is required for iyzico payments.',
            'country.required' => $keywords['country_required_for_iyzico'] ?? 'The country field is required for iyzico payments.',
            'address.required' => $keywords['address_required_for_iyzico'] ?? 'The address field is required for iyzico payments.',
            'zip_code.required' => $keywords['zip_code_required_for_iyzico'] ?? 'The zip code field is required for iyzico payments.',
            'name.max' => $keywords['name_max_255'] ?? 'The name may not be greater than 255 characters.',
            'email.email' => $keywords['valid_email_required'] ?? 'Please enter a valid email address.',
            'email.max' => $keywords['email_max_255'] ?? 'The email may not be greater than 255 characters.',
            'paystack_email.required' => $keywords['paystack_email_required'] ?? 'The paystack email field is required.',
            'paystack_email.email' => $keywords['paystack_valid_email'] ?? 'Please enter a valid paystack email address.',
            'flutterwave_email.required' => $keywords['flutterwave_email_required'] ?? 'The flutterwave email field is required.',
            'flutterwave_email.email' => $keywords['flutterwave_valid_email'] ?? 'Please enter a valid flutterwave email address.',
            'razorpay_email.required' => $keywords['razorpay_email_required'] ?? 'The razorpay email field is required.',
            'razorpay_email.email' => $keywords['razorpay_valid_email'] ?? 'Please enter a valid razorpay email address.',
            'razorpay_phone.required' => $keywords['razorpay_phone_required'] ?? 'The razorpay phone field is required.',
            'razorpay_phone.numeric' => $keywords['razorpay_phone_numeric'] ?? 'The razorpay phone must be a number.',
            'paytm_email.required' => $keywords['paytm_email_required'] ?? 'The paytm email field is required.',
            'paytm_email.email' => $keywords['paytm_valid_email'] ?? 'Please enter a valid paytm email address.',
            'paytm_phone.required' => $keywords['paytm_phone_required'] ?? 'The paytm phone field is required.',
            'paytm_phone.numeric' => $keywords['paytm_phone_numeric'] ?? 'The paytm phone must be a number.',
            'amount.required' => $keywords['amount_required'] ?? 'The amount field is required.',
        ];

        $validator = Validator::make($request->all(), [
            'gateway' => 'required',
            'name' => $request->gateway == 'iyzico' ? 'required' : '',
            'phone' => $request->gateway == 'iyzico' ? 'required' : '',
            'email' => $request->gateway == 'iyzico' ? 'required' : '',
            'identity_number' => $request->gateway == 'iyzico' ? 'required' : '',
            'city' => $request->gateway == 'iyzico' ? 'required' : '',
            'country' => $request->gateway == 'iyzico' ? 'required' : '',
            'address' => $request->gateway == 'iyzico' ? 'required' : '',
            'zip_code' => $request->gateway == 'iyzico' ? 'required' : '',
        ], $customMessages);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        $user = getUser();
        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($user->id);
        $setting = DB::table('user_donation_settings')->where('user_id', $user->id)->first();
        $causeId = $request->cause_id;
        if ($setting->donation_guest_checkout == 0 && !Auth::guard('customer')->check()) {
            return redirect()->route('customer.login', [getParam(), 'redirected' => 'causes']);
        }

        if ($request->amount < $request->minimum_amount) {
            return redirect()->back()->with('error', $keywords['amount_minimum_required'] ?? 'Amount must be minimum ' . $request->minimum_amount . ' ' . $currencyInfo->base_currency_text)->withInput();
        }
        // dd($request->all());
        if (!$request->exists('gateway')) {
            return redirect()->back()->with('error', 'Choose a payment method')->withInput();
        } elseif ($request['gateway'] == 'paypal') {
            $paypal = new PayPalController();
            return $paypal->donationProcess($request, $causeId, $user->id);
        } elseif ($request['gateway'] == 'instamojo') {

            $paypal = new InstamojoController();
            return $paypal->donationProcess($request, $causeId, $user->id);
        } else if ($request['gateway'] == 'paystack') {

            $validator = Validator::make($request->all(), [
                'name' => $request->has('checkbox') === true ? 'max:255' : 'required',
                'email' => $request->has('checkbox') === true ? 'max:255' : 'required|email',
                'paystack_email' => $request->has('checkbox') === true ? 'required|email' : 'nullable',
                'amount' => 'required',
            ], $customMessages);

            if ($validator->fails()) {
                return redirect()->back()->withErrors($validator)->withInput();
            }
            $paystack = new PaystackController();
            return $paystack->donationProcess($request, $causeId, $user->id);
        } else if ($request['gateway'] == 'flutterwave') {

            $validator = Validator::make($request->all(), [
                'name' => $request->has('checkbox') === true ? 'max:255' : 'required',
                'email' => $request->has('checkbox') === true ? 'max:255' : 'required|email',
                'flutterwave_email' => $request->has('checkbox') === true ? 'required|email' : 'nullable',
                'amount' => 'required',
            ], $customMessages);
            if ($validator->fails()) {
                return redirect()->back()->withErrors($validator)->withInput();
            }
            $flutterwave = new FlutterwaveController;
            return $flutterwave->donationProcess($request, $causeId, $user->id);
        } else if ($request['gateway'] == 'razorpay') {

            $validator = Validator::make($request->all(), [
                'name' => $request->has('checkbox') === true ? 'max:255' : 'required',
                'email' => $request->has('checkbox') === true ? 'max:255' : 'required|email',
                'razorpay_email' => $request->has('checkbox') === true ? 'required|email' : 'nullable',
                'razorpay_phone' => $request->has('checkbox') === true ? 'required|numeric' : 'nullable',
                'amount' => 'required',
            ], $customMessages);
            if ($validator->fails()) {
                return redirect()->back()->withErrors($validator)->withInput();
            }
            $razorpay = new RazorpayController();
            return $razorpay->donationProcess($request, $causeId, $user->id);
        } else if ($request['gateway'] == 'mercadopago') {
            $mercadopago = new MercadoPagoController();
            return $mercadopago->donationProcess($request, $causeId, $user->id);
        } else if ($request['gateway'] == 'mollie') {
            $mollie = new MollieController();
            return $mollie->donationProcess($request, $causeId, $user->id);
        } else if ($request['gateway'] == 'paytm') {
            $validator = Validator::make($request->all(), [
                'name' => $request->has('checkbox') === true ? 'max:255' : 'required',
                'email' => $request->has('checkbox') === true ? 'max:255' : 'required|email',
                'paytm_email' => $request->has('checkbox') === true ? 'required|email' : 'nullable',
                'paytm_phone' => $request->has('checkbox') === true ? 'required|numeric' : 'nullable',
                'amount' => 'required',
            ], $customMessages);
            if ($validator->fails()) {
                return redirect()->back()->withErrors($validator)->withInput();
            }

            $paytm = new PaytmController();
            return $paytm->donationProcess($request, $causeId, $user->id);
        } else if ($request['gateway'] == 'stripe') {
            $stripe = new StripeController();
            return $stripe->donationProcess($request, $causeId, $user->id);
        } else if ($request['gateway'] == 'authorize.net') {
            $authorizeNet = new AuthorizenetController();
            return $authorizeNet->donationProcess($request, $causeId, $user->id);
        } else if ($request['gateway'] == 'phonepe') {
            $phonepe = new PhonePeController();
            return $phonepe->donationProcess($request, $causeId, $user->id);
        } else if ($request['gateway'] == 'perfect_money') {
            $perfect_money = new PerfectMoneyController();
            return $perfect_money->donationProcess($request, $causeId, $user->id);
        } else if ($request['gateway'] == 'xendit') {
            $xendit = new XenditController();
            return $xendit->donationProcess($request, $causeId, $user->id);
        } else if ($request['gateway'] == 'yoco') {
            $yoco = new YocoController();
            return $yoco->donationProcess($request, $causeId, $user->id);
        } else if ($request['gateway'] == 'toyyibpay') {
            $toyyibpay = new ToyyibpayController();
            return $toyyibpay->donationProcess($request, $causeId, $user->id);
        } else if ($request['gateway'] == 'paytabs') {
            $toyyibpay = new PaytabsController();
            return $toyyibpay->donationProcess($request, $causeId, $user->id);
        } else if ($request['gateway'] == 'midtrans') {
            $midtrans = new MidtransController();
            return $midtrans->donationProcess($request, $causeId, $user->id);
        } else if ($request['gateway'] == 'myfatoorah') {
            $myfatoorah = new MyFatoorahController();
            return $myfatoorah->donationProcess($request, $causeId, $user->id);
        } else if ($request['gateway'] == 'iyzico') {
            $iyzico = new IyzicoController();
            return $iyzico->donationProcess($request, $causeId, $user->id);
        } else {
            $validator = Validator::make($request->all(), [
                'name' => $request->has('checkbox') === true ? 'max:255' : 'required',
                'email' => $request->has('checkbox') === true ? 'max:255' : 'required|email',
                'amount' => 'required',
            ], $customMessages);
            if ($validator->fails()) {
                return redirect()->back()->withErrors($validator)->withInput();
            }
            $offline = new OfflineController();
            return $offline->donationProcess($request, $causeId, $user->id);
        }
    }

    public function store($information, $userId)
    {

        $curencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);
        return $donation = DonationDetail::create([
            'user_id' => $userId,
            'customer_id' => Auth::guard('customer')->check() ? Auth::guard('customer')->user()->id : NULL,
            'name' => $information['name'],
            'email' => $information['email'],
            'phone' => $information['phone'],
            'amount' => $information['amount'],
            'currency' => $curencyInfo->base_currency_text,
            'currency_position' => $curencyInfo->base_currency_text_position,
            'currency_symbol' => $curencyInfo->base_currency_symbol,
            'currency_symbol_position' => $curencyInfo->base_currency_symbol_position,
            'payment_method' => $information['paymentMethod'],
            'transaction_id' => uniqid(),
            'status' => $information['paymentStatus'],
            'receipt' => $information['attachmentFile'] ?? null,
            'transaction_details' => $information['gatewayType'],
            'bex_details' => json_encode($curencyInfo),
            'donation_id' => $information['causeId'],
            'conversation_id' => array_key_exists('conversation_id', $information) ? $information['conversation_id'] : null,
        ]);
    }

    public function generateInvoice($donation, $userId)
    {

        $fileName = $donation->transaction_id . ".pdf";

        $directory = public_path(Constant::WEBSITE_DONATION_INVOICE . '/');
        if (!file_exists($directory)) {
            mkdir($directory, 0775, true);
        }
        $fileLocated = $directory . $fileName;

        $language = $this->getUserCurrentLanguage($userId);
        $cause = Donation::query()
            ->where('id', $donation->donation_id)
            ->firstOrFail();
        $causeInfo = DonationContent::query()
            ->where('user_id', $userId)
            ->where('donation_id', $cause->id)
            ->where('language_id', $language->id)
            ->select('title')
            ->firstOrFail();

        PDF::loadView('pdf.donation', compact('donation', 'causeInfo'))->save($fileLocated);

        return $fileName;
    }

    public function sendMail($donationInfo, $userId)
    {

        $mailTemplate = UserEmailTemplate::query()
            ->where('email_type', 'donation')
            ->where('user_id', $userId)
            ->first();
        $mailSubject = $mailTemplate->email_subject;
        $mailBody = $mailTemplate->email_body;

        // second get the website title & mail's smtp info from db
        $be = DB::table('basic_extendeds')
            ->select('is_smtp', 'smtp_host', 'smtp_username', 'smtp_password', 'from_mail', 'from_name')
            ->first();

        $userBs = BasicSetting::query()->where('user_id', $userId)
            ->select('website_title', 'email', 'from_name')
            ->first();



        $language = $this->getUserCurrentLanguage($userId);
        $cause = Donation::query()
            ->where('id', $donationInfo->donation_id)
            ->firstOrFail();
        $causeInfo = DonationContent::query()
            ->where('user_id', $userId)
            ->where('donation_id', $cause->id)
            ->where('language_id', $language->id)
            ->select('title')
            ->firstOrFail();

        $websiteTitle = $userBs->website_title;

        $mailBody = str_replace('{donor_name}', $donationInfo->name, $mailBody);
        $mailBody = str_replace('{cause_name}', $causeInfo->title, $mailBody);
        $mailBody = str_replace('{website_title}', $websiteTitle, $mailBody);


        // initialize a new mail
        $mail = new PHPMailer(true);
        $mail->CharSet = 'UTF-8';
        $mail->Encoding = 'base64';

        // if smtp status == 1, then set some value for PHPMailer
        if ($be->is_smtp == 1) {
            $mail->isSMTP();
            $mail->Host = $be->smtp_host;
            $mail->SMTPAuth = true;
            $mail->Username = $be->smtp_username;
            $mail->Password = $be->smtp_password;
            // if ($be->encryption == 'TLS') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            // }
            $mail->Port = 587;
        }
        // finally, add other informations and send the mail
        try {
            // Recipients
            $mail->setFrom($be->from_mail, $userBs->from_name);
            $mail->addReplyTo($userBs->email, $userBs->from_name);
            $mail->addAddress($donationInfo->email);
            $path = public_path(Constant::WEBSITE_DONATION_INVOICE . '/' . $donationInfo->invoice);
            // Attachments (Invoice)

            $mail->addAttachment($path);
            // Content
            $mail->isHTML(true);
            $mail->Subject = $mailSubject;
            $mail->Body = $mailBody;
            $mail->send();
            @unlink(public_path(Constant::WEBSITE_DONATION_INVOICE) . '/' . $donationInfo->invoice);
            return;
        } catch (\Exception $e) {
            return session()->flash('error', 'Mail could not be sent! Mailer Error: ' . $e);
        }
    }
    public function complete(Request $request)
    {
        if ($request->via == 'offline') {
            $request = $request->via;
            return view('user-front.offline-success', compact('request'));
        } else {

            $request = 'online';
            return view('user-front.success', compact('request'));
        }
    }
    public function cancel(Request $request, $domain, $id)
    {
        $user = getUser();
        $language = $this->getUserCurrentLanguage($user->id);
        $donation = Donation::query()->where('user_id', $user->id)->findOrFail($id);

        $donationInfo = DonationContent::query()
            ->where('donation_id', $donation->id)
            ->where('user_id', $user->id)
            ->where('language_id', $language->id)
            ->firstOrFail();

        session()->flash('error', 'Sorry, an error has occurred!');

        return redirect()->route('front.user.causesDetails', [getParam(), 'slug' => $donationInfo->slug]);
    }
}
