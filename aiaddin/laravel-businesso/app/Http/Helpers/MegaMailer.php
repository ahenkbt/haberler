<?php

namespace App\Http\Helpers;

use App\Models\Language;
use App\Models\BasicExtended;
use App\Models\EmailTemplate;
use App\Models\User\BasicSetting;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;
use App\Models\User\UserEmailTemplate;
use Illuminate\Support\Facades\Session;

class MegaMailer
{

    public function mailFromAdmin($data)
    {
        $temp = EmailTemplate::where('email_type', '=', $data['templateType'])->first();
        $body = $temp->email_body;
        if (array_key_exists('username', $data)) {
            $body = preg_replace("/{username}/", $data['username'], $body);
        }
        if (array_key_exists('replaced_package', $data)) {
            $body = preg_replace("/{replaced_package}/", $data['replaced_package'], $body);
        }
        if (array_key_exists('removed_package_title', $data)) {
            $body = preg_replace("/{removed_package_title}/", $data['removed_package_title'], $body);
        }
        if (array_key_exists('package_title', $data)) {
            $body = preg_replace("/{package_title}/", $data['package_title'], $body);
        }
        if (array_key_exists('package_price', $data)) {
            $body = preg_replace("/{package_price}/", $data['package_price'], $body);
        }
        if (array_key_exists('discount', $data)) {
            $body = preg_replace("/{discount}/", $data['discount'], $body);
        }
        if (array_key_exists('total', $data)) {
            $body = preg_replace("/{total}/", $data['total'], $body);
        }
        if (array_key_exists('activation_date', $data)) {
            $body = preg_replace("/{activation_date}/", $data['activation_date'], $body);
        }
        if (array_key_exists('expire_date', $data)) {
            $body = preg_replace("/{expire_date}/", $data['expire_date'], $body);
        }
        if (array_key_exists('requested_domain', $data)) {
            $body = preg_replace("/{requested_domain}/", "<a href='http://" . $data['requested_domain'] . "'>" . $data['requested_domain'] . "</a>", $body);
        }
        if (array_key_exists('previous_domain', $data)) {
            $body = preg_replace("/{previous_domain}/", "<a href='http://" . $data['previous_domain'] . "'>" . $data['previous_domain'] . "</a>", $body);
        }
        if (array_key_exists('current_domain', $data)) {
            $body = preg_replace("/{current_domain}/", "<a href='http://" . $data['current_domain'] . "'>" . $data['current_domain'] . "</a>", $body);
        }
        if (array_key_exists('subdomain', $data)) {
            $body = preg_replace("/{subdomain}/", "<a href='http://" . $data['subdomain'] . "'>" . $data['subdomain'] . "</a>", $body);
        }
        if (array_key_exists('last_day_of_membership', $data)) {
            $body = preg_replace("/{last_day_of_membership}/", $data['last_day_of_membership'], $body);
        }
        if (array_key_exists('login_link', $data)) {
            $body = preg_replace("/{login_link}/", $data['login_link'], $body);
        }
        if (array_key_exists('customer_name', $data)) {
            $body = preg_replace("/{customer_name}/", $data['customer_name'], $body);
        }
        if (array_key_exists('verification_link', $data)) {
            $body = preg_replace("/{verification_link}/", $data['verification_link'], $body);
        }
        if (array_key_exists('website_title', $data)) {
            $body = preg_replace("/{website_title}/", $data['website_title'], $body);
        }
        if (session()->has('lang')) {
            $currentLang = Language::where('code', session()->get('lang'))->first();
        } else {
            $currentLang = Language::where('is_default', 1)->first();
        }
        $be = $currentLang->basic_extended;
        $mail = new PHPMailer(true);
        $mail->CharSet = "UTF-8";
        if ($be->is_smtp == 1) {
            try {
                $mail->isSMTP();
                $mail->Host       = $be->smtp_host;
                $mail->SMTPAuth   = true;
                $mail->Username   = $be->smtp_username;
                $mail->Password   = $be->smtp_password;
                $mail->SMTPSecure = $be->encryption;
                $mail->Port       = $be->smtp_port;
            } catch (\Exception $e) {
                Session::flash('error', $e->getMessage());
                return back();
            }
        }
        try {
            //Recipients
            $mail->setFrom($be->from_mail, $be->from_name);
            $mail->addAddress($data['toMail'], $data['toName']);
            // Attachments
            if (array_key_exists('membership_invoice', $data)) {
                $mail->addAttachment(public_path('assets/front/invoices/' . $data['membership_invoice']));
            }
            // Content
            $mail->isHTML(true);
            $mail->Subject = $temp->email_subject;
            $mail->Body    = $body;
            $mail->send();
            // Attachments
            if (array_key_exists('membership_invoice', $data)) {
                @unlink(public_path('assets/front/invoices/' . $data['membership_invoice']));
            }
        } catch (\Exception $e) {
            Session::flash('error', $e->getMessage());
            return back();
        }
    }


    public function mailFromTenant($data)
    {
        if (Session::has('user_midtrans')) {
            $user = Session::get('user_midtrans');
        } else {
            $user = getUser();
        }
        $temp = UserEmailTemplate::where('user_id', $user->id)->where('email_type', '=', $data['templateType'])->first();
        $body = $temp->email_body;
        if (array_key_exists('customer_name', $data)) {
            $body = preg_replace("/{customer_name}/", $data['customer_name'], $body);
        }
        if (array_key_exists('customer_name', $data)) {
            $body = preg_replace("/{billing_fname}/", $data['customer_name'], $body);
        }
        if (array_key_exists('billing_lname', $data)) {
            $body = preg_replace("/{billing_lname}/", $data['billing_lname'], $body);
        }
        if (array_key_exists('billing_address', $data)) {
            $body = preg_replace("/{billing_address}/", $data['billing_address'], $body);
        }
        if (array_key_exists('billing_city', $data)) {
            $body = preg_replace("/{billing_city}/", $data['billing_city'], $body);
        }
        if (array_key_exists('billing_country', $data)) {
            $body = preg_replace("/{billing_country}/", $data['billing_country'], $body);
        }
        if (array_key_exists('billing_number', $data)) {
            $body = preg_replace("/{billing_number}/", $data['billing_number'], $body);
        }
        if (array_key_exists('shpping_fname', $data)) {
            $body = preg_replace("/{shpping_fname}/", $data['shpping_fname'], $body);
        }
        if (array_key_exists('shpping_lname', $data)) {
            $body = preg_replace("/{shpping_lname}/", $data['shpping_lname'], $body);
        }
        if (array_key_exists('shpping_address', $data)) {
            $body = preg_replace("/{shpping_address}/", $data['shpping_address'], $body);
        }
        if (array_key_exists('shpping_country', $data)) {
            $body = preg_replace("/{shpping_country}/", $data['shpping_country'], $body);
        }
        if (array_key_exists('shpping_number', $data)) {
            $body = preg_replace("/{shpping_number}/", $data['shpping_number'], $body);
        }

        if (array_key_exists('order_number', $data)) {
            $body = preg_replace("/{order_number}/", $data['order_number'], $body);
        }
        if (array_key_exists('order_link', $data)) {
            $body = preg_replace("/{order_link}/", $data['order_link'], $body);
        }
        if (array_key_exists('website_title', $data)) {
            $body = preg_replace("/{website_title}/", $data['website_title'], $body);
        }
        if (array_key_exists('shpping_city', $data)) {
            $body = preg_replace("/{shpping_city}/", $data['shpping_city'], $body);
        }

        if (session()->has('lang')) {
            $currentLang = Language::where('code', session()->get('lang'))->first();
        } else {
            $currentLang = Language::where('is_default', 1)->first();
        }
        $be = $currentLang->basic_extended;

        $info = BasicSetting::where('user_id', $user->id)->select('email', 'from_name')->first();
        $replyTo = $info->email ?? $user->email;
        $fromName = $info->from_name ?? $user->company_name;

        $mail = new PHPMailer(true);
        $mail->CharSet = "UTF-8";
        if ($be->is_smtp == 1) {
            try {
                $mail->isSMTP();
                $mail->Host       = $be->smtp_host;
                $mail->SMTPAuth   = true;
                $mail->Username   = $be->smtp_username;
                $mail->Password   = $be->smtp_password;
                $mail->SMTPSecure = $be->encryption;
                $mail->Port       = $be->smtp_port;
            } catch (Exception $e) {
                die('1st: ' . $e->getMessage());
            }
        }
        try {
            //Recipients
            $mail->setFrom($be->from_mail, $fromName);
            $mail->addAddress($data['toMail'], $data['toName']);
            // $mail->addReplyTo($replyTo);
            // Attachments
            if (array_key_exists('attachment', $data)) {
                $mail->addAttachment(public_path('assets/front/invoices/' . $data['attachment']));
            }
            // Content
            $mail->isHTML(true);
            $mail->Subject = $temp->email_subject;
            $mail->Body    = $body;
            $mail->send();
        } catch (\Exception $e) {
            die('2nd: ' . $e->getMessage());
            Session::flash('success', $e->getMessage());
            return back();
        }
    }
    public function mailToAdmin($data)
    {
        $be = BasicExtended::first();

        $mail = new PHPMailer(true);
        $mail->CharSet = "UTF-8";
        if ($be->is_smtp == 1) {
            try {
                $mail->isSMTP();
                $mail->Host = $be->smtp_host;
                $mail->SMTPAuth = true;
                $mail->Username = $be->smtp_username;
                $mail->Password = $be->smtp_password;
                $mail->SMTPSecure = $be->encryption;
                $mail->Port = $be->smtp_port;
            } catch (\Exception $e) {
                Session::flash('error', $e->getMessage());
                return back();
            }
        }
        try {
            $mail->setFrom($be->from_mail, $data['fromName']);
            $mail->addAddress($be->to_mail);     // Add a recipient
            // Content
            $mail->isHTML(true);  // Set email format to HTML
            $mail->Subject = $data['subject'];
            $mail->Body = $data['body'];
            $mail->addReplyTo($data['fromMail']);  // reply to
            $mail->send();
        } catch (\Exception $e) {

            Session::flash('error', $e->getMessage());
            return back();
        }
    }
    public function mailContactMessage($data)
    {

        if (session()->has('lang')) {
            $currentLang = Language::where('code', session()->get('lang'))->first();
        } else {
            $currentLang = Language::where('is_default', 1)->first();
        }
        $be = $currentLang->basic_extended;

        $mail = new PHPMailer(true);
        $mail->CharSet = "UTF-8";
        if ($be->is_smtp == 1) {
            try {
                $mail->isSMTP();
                $mail->Host = $be->smtp_host;
                $mail->SMTPAuth = true;
                $mail->Username = $be->smtp_username;
                $mail->Password = $be->smtp_password;
                $mail->SMTPSecure = $be->encryption;
                $mail->Port = $be->smtp_port;
            } catch (\Exception $e) {
                Session::flash('error', $e->getMessage());
                return back();
            }
        }
        try {
            //Recipients
            $mail->setFrom($be->from_mail, $data['fullname']);
            $mail->addAddress($data['toMail'], $data['toName']);
            // Content
            $mail->isHTML(true);
            $mail->Subject = $data['subject'];
            $mail->Body = $data['body'];
            $mail->addReplyTo($data['email']);
            $mail->send();
        } catch (\Exception $e) {
            Session::flash('error', $e->getMessage());
            return back();
        }
    }

    public function mailSimpleFromAdmin(array $data)
    {
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        $mail->CharSet = "UTF-8";

        if (session()->has('lang')) {
            $currentLang = \App\Models\Language::where('code', session()->get('lang'))->first();
        } else {
            $currentLang = \App\Models\Language::where('is_default', 1)->first();
        }

        $be = $currentLang?->basic_extended;
        if (!$be) {
            return false;
        }

        // SMTP debug
        // $mail->SMTPDebug = 2;
        // $mail->Debugoutput = function ($str, $level) {
        //     \Log::info("PHPMailer SMTP Debug ($level): $str");
        // };

        if ((int)$be->is_smtp === 1) {
            $mail->isSMTP();
            $mail->Host       = trim((string)$be->smtp_host);
            $mail->SMTPAuth   = true;
            $mail->Username   = trim((string)$be->smtp_username);
            $mail->Password   = (string)$be->smtp_password;
            $mail->Port       = (int)$be->smtp_port;

            // normalize encryption
            $enc = strtolower((string) ($be->encryption ?? ''));
            if (in_array($enc, ['tls', 'starttls'])) {
                $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
                $mail->SMTPAutoTLS = true;
            } elseif ($enc === 'ssl') {
                $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
            } else {
                $mail->SMTPSecure = false;
                $mail->SMTPAutoTLS = false;
            }

            // to diagnose cert issues
            $mail->SMTPOptions = [
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true,
                ],
            ];
        }

        $mail->setFrom($be->from_mail, $be->from_name);
        $mail->addAddress($data['toMail'], $data['toName']);
        $mail->isHTML(true);
        $mail->Subject = (string) $data['subject'];
        $mail->Body    = trim((string) $data['body']);
        $mail->AltBody = strip_tags($mail->Body);

        return $mail->send();
    }
}
