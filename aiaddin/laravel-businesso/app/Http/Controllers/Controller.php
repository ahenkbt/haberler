<?php

namespace App\Http\Controllers;

use PDF;
use Carbon\Carbon;
use App\Models\Language;
use App\Models\User\UserItem;
use App\Models\User\UserOrder;
use App\Http\Helpers\MegaMailer;
use App\Models\User\BasicSetting;
use App\Models\User\UserOrderItem;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;
use App\Models\User\UserItemContent;
use Illuminate\Support\Facades\Auth;
use App\Models\User\UserItemVariation;
use Illuminate\Support\Facades\Config;
use App\Models\User\UserOfflineGateway;
use App\Models\User\UserShippingCharge;
use Illuminate\Support\Facades\Session;
use App\Models\User\Language as UserLanguage;
use Illuminate\Foundation\Bus\DispatchesJobs;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class Controller extends BaseController
{
    use AuthorizesRequests, DispatchesJobs, ValidatesRequests;


    public function getUserCurrentLanguage($userId)
    {
        if (session()->has('user_lang')) {
            $userCurrentLang = UserLanguage::where('code', session()->get('user_lang'))->where('user_id', $userId)->firstOrFail();
            if (empty($userCurrentLang)) {
                $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $userId)->firstOrFail();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $userId)->firstOrFail();
        }
        return $userCurrentLang;
    }


    public function sendMailWithPhpMailer($request, $file_name, $be, $subject, $body, $email, $name)
    {
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
                $mail->setFrom($be->from_mail, $be->from_name);
                $mail->addAddress($email, $name);
                if ($file_name) {
                    $mail->addAttachment(public_path('assets/front/invoices/' . $file_name));
                }
                $mail->isHTML(true);
                $mail->Subject = $subject;
                $mail->Body = $body;
                $mail->send();
                if ($file_name) {
                    @unlink(public_path('assets/front/invoices/' . $file_name));
                }
            } catch (Exception $e) {
                session()->flash('error', $e->getMessage());
                return back();
            }
        } else {
            try {
                $mail->setFrom($be->from_mail, $be->from_name);
                $mail->addAddress($email, $name);
                if ($file_name) {
                    $mail->addAttachment(public_path('assets/front/invoices/' . $file_name));
                }
                $mail->isHTML(true);
                $mail->Subject = $subject;
                $mail->Body = $body;
                $mail->send();
                if ($file_name) {
                    @unlink(public_path('assets/front/invoices/' . $file_name));
                }
            } catch (Exception $e) {
                session()->flash('error', $e->getMessage());
                return back();
            }
        }
    }

    public function makeInvoice($request, $key, $member, $password, $amount, $payment_method, $phone, $base_currency_symbol_position, $base_currency_symbol, $base_currency_text, $order_id, $package_title, $membership)
    {
        $file_name = uniqid($key) . ".pdf";
        $pdf = PDF::setOptions([
            'isHtml5ParserEnabled' => true, 'isRemoteEnabled' => true,
            'logOutputFile' => storage_path('logs/log.htm'),
            'tempDir' => storage_path('logs/')
        ])->loadView('pdf.membership', compact('request', 'member', 'password', 'amount', 'payment_method', 'phone', 'base_currency_symbol_position', 'base_currency_symbol', 'base_currency_text', 'order_id', 'package_title', 'membership'));
        $output = $pdf->output();
        @mkdir(public_path('assets/front/invoices/'), 0775, true);
        file_put_contents(public_path('assets/front/invoices/' . $file_name), $output);
        return $file_name;
    }

    public function resetPasswordMail($email, $name, $subject, $body)
    {
        $currentLang = session()->has('lang') ?
            (Language::where('code', session()->get('lang'))->first())
            : (Language::where('is_default', 1)->first());
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
                $mail->setFrom($be->from_mail, $be->from_name);
                $mail->addAddress($email, $name);
                $mail->isHTML(true);
                $mail->Subject = $subject;
                $mail->Body = $body;
                $mail->send();
            } catch (Exception $e) {
                session()->flash('error', $e->getMessage());
                return back();
            }
        } else {
            try {
                $mail->setFrom($be->from_mail, $be->from_name);
                $mail->addAddress($email, $name);
                $mail->isHTML(true);
                $mail->Subject = $subject;
                $mail->Body = $body;
                $mail->send();
            } catch (Exception $e) {
                session()->flash('error', $e->getMessage());
                return back();
            }
        }
    }


    // items checkout 
    public function orderTotal($shipping)
    {
        if ($shipping != 0) {
            $shipping = UserShippingCharge::findOrFail($shipping);
            $shippig_charge = (int)$shipping->charge;
        } else {
            $shippig_charge = 0;
        }
        $total = (cartTotal() - coupon()) + $shippig_charge + tax();
        return round($total, 2);
    }
    public function orderValidation($request, $gtype = 'online')
    {
        $keywords = getUserKeywords();
        $rules = [
            'billing_fname' => 'required',
            'billing_lname' => 'required',
            'billing_address' => 'required',
            'billing_city' => 'required',
            'billing_country' => 'required',
            'billing_number' => 'required',
            'billing_email' => 'required',
            'shpping_fname' => 'required',
            'shpping_lname' => 'required',
            'shpping_address' => 'required',
            'shpping_city' => 'required',
            'shpping_country' => 'required',
            'shpping_number' => 'required',
            'shpping_email' => 'required',
            'identity_number' => $request->payment_method == 'Iyzico' ? 'required' : '',
            'zip_code' => $request->payment_method == 'Iyzico' ? 'required' : '',
        ];

        $messages = [
            'billing_fname.required' => $keywords['billing_fname_required'] ?? __('Billing first name is required.') . '.',
            'billing_lname.required' => $keywords['billing_lname_required'] ?? __('Billing last name is required.') . '.',
            'billing_address.required' => $keywords['billing_address_required'] ?? __('Billing address is required.') . '.',
            'billing_city.required' => $keywords['billing_city_required'] ?? __('Billing city is required.') . '.',
            'billing_country.required' => $keywords['billing_country_required'] ?? __('Billing country is required.') . '.',
            'billing_number.required' => $keywords['billing_number_required'] ?? __('Billing phone number is required.') . '.',
            'billing_email.required' => $keywords['billing_email_required'] ?? __('Billing email is required.') . '.',
            'shpping_fname.required' => $keywords['shpping_fname_required'] ?? __('Shipping first name is required.') . '.',
            'shpping_lname.required' => $keywords['shpping_lname_required'] ?? __('Shipping last name is required.') . '.',
            'shpping_address.required' => $keywords['shpping_address_required'] ?? __('Shipping address is required.') . '.',
            'shpping_city.required' => $keywords['shpping_city_required'] ?? __('Shipping city is required.') . '.',
            'shpping_country.required' => $keywords['shpping_country_required'] ?? __('Shipping country is required.') . '.',
            'shpping_number.required' => $keywords['shpping_number_required'] ?? __('Shipping phone number is required.') . '.',
            'shpping_email.required' => $keywords['shpping_email_required'] ?? __('Shipping email is required.') . '.',
            'identity_number.required' => $keywords['identity_number_required'] ?? __('Identity number is required.') . '.',
            'zip_code.required' => $keywords['zip_code_required'] ?? __('Zip code is required.') . '.',
        ];

        if ($gtype == 'offline') {
            $gateway = UserOfflineGateway::find($request->method);
            if ($gateway->is_receipt == 1) {
                $rules['receipt'] = [
                    'required',
                    function ($attribute, $value, $fail) use ($request, $keywords) {
                        $ext = $request->file('receipt')->getClientOriginalExtension();
                        if (!in_array($ext, array('jpg', 'png', 'jpeg'))) {
                            return $fail($keywords['receipt_invalid_extension'] ?? __('Only png, jpg, jpeg image is allowed.') . '.');
                        }
                    },
                ];
                $messages['receipt.required'] = $keywords['receipt_required'] ?? __('Receipt is required.') . '.';
            }
        }

        $request->validate($rules, $messages);
    }


    public function saveOrder($request, $txnId, $chargeId, $paymentStatus = 'Pending')
    {
        $total = $this->orderTotal($request["shipping_charge"] ?? 0);


        if ((int)$request['shipping_charge'] != 0) {
            $shipping = UserShippingCharge::findOrFail($request['shipping_charge']);
            $shippig_charge = $shipping->charge;
            $shipping_method = $shipping->title;
        } else {
            $shippig_charge = 0;
            $shipping_method = NULL;
        }

        if (Session::has('user_midtrans')) {
            $user = Session::get('user_midtrans');
        } else {
            $user = getUser();
        }
        $userBs = BasicSetting::where('user_id', $user->id)->first();
        $order = new UserOrder();

        $order->user_id = $user->id;
        $order->customer_id = Auth::guard('customer')->user()->id;
        $order->billing_fname = $request['billing_fname'];
        $order->billing_lname = $request['billing_lname'];
        $order->billing_email = $request['billing_email'];
        $order->billing_address = $request['billing_address'];
        $order->billing_city = $request['billing_city'];
        $order->billing_country = $request['billing_country'];
        $order->billing_number = $request['billing_number'];
        $order->shpping_fname = $request['shpping_fname'];
        $order->shpping_lname = $request['shpping_lname'];
        $order->shpping_email = $request['shpping_email'];
        $order->shpping_address = $request['shpping_address'];
        $order->shpping_city = $request['shpping_city'];
        $order->shpping_country = $request['shpping_country'];
        $order->shpping_number = $request['shpping_number'];
        $order->order_status = 'Pending';
        $order->gateway_type = $request['mode'];

        $order->cart_total = cartTotal();
        $order->tax = tax();
        $order->discount = coupon();
        $order->total = $total;
        $order->shipping_method = $shipping_method;
        $order->shipping_charge = round($shippig_charge, 2);
        if ($request['mode'] == 'online') {
            $order->method = $request['payment_method'];
        } elseif ($request['mode'] == 'offline') {
            $gateway = UserOfflineGateway::where('name', $request['payment_method'])->where('user_id', $user->id)->first();

            $order->method = $gateway->name;
            if ($request->hasFile('receipt')) {
                // store the receipt in folder & database
                $receipt = uniqid() . '.' . $request->file('receipt')->getClientOriginalExtension();
                $request->file('receipt')->move(public_path('assets/front/receipt/'), $receipt);
                $order->receipt = $receipt;
            } else {
                $order->receipt = NULL;
            }
        }
        $order->currency_code = $userBs->base_currency_text;
        $order['order_number'] = \Str::random(4) . time();
        $order['payment_status'] = $paymentStatus;
        $order['txnid'] = $txnId;
        $order['charge_id'] = $chargeId;
        $order['conversation_id'] = Session::has('conversation_id') ? Session::get('conversation_id') : null;
        $order->save();
        return $order;
    }


    public function saveOrderedItems($orderId)
    {
        if (Session::has('user_midtrans')) {
            $user = Session::get('user_midtrans');
        } else {
            $user = getUser();
        }

        $bs = BasicSetting::where('user_id', $user->id)->first();
        Config::set('app.timezone', $bs->timezoneinfo->timezone);

        $cart = Session::get('cart');
        $items = [];
        $qty = [];
        $total = [];
        $variations = [];

        foreach ($cart as $id => $crtitm) {
            $qty[] = $crtitm['qty'];
            $total[] = $crtitm['total'];
            $product_price[] = $crtitm['product_price'];
            $variations[] = json_encode($crtitm['variations']);
            $items[] = UserItem::findOrFail($crtitm['id']);
        }


        if (session()->has('user_lang')) {
            $userCurrentLang = UserLanguage::where('code', session()->get('user_lang'))->where('user_id', $user->id)->firstOrFail();
            if (empty($userCurrentLang)) {
                $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->firstOrFail();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->firstOrFail();
        }
        foreach ($items as $key => $item) {
            $itemcontent = UserItemContent::where('item_id', $item->id)->where('language_id', $userCurrentLang->id)->first();
            $v_total = 0;
            if ($item->type == 'physical') {
                $orderderd_variations = json_decode($variations[$key]);
                // if variation present minus the quantity for all languages 
                if ($orderderd_variations) {

                    foreach ($orderderd_variations as $vkey => $value) {
                        $db_variation = UserItemVariation::where('variant_name', $vkey)->where('item_id', $itemcontent->item_id)->where('language_id', $userCurrentLang->id)->first();
                        $db_variations_all_languages = UserItemVariation::where('item_id', $itemcontent->item_id)->where('indx', $db_variation->indx)->get();
                        $db_op_name = json_decode($db_variation->option_name);
                        $db_op_stock = [];
                        $okey  = array_search($value->name, $db_op_name);
                        foreach ($db_variations_all_languages as $allvkey => $allVval) {
                            $db_op_stock = json_decode($allVval->option_stock);
                            $db_op_stock[$okey] = $db_op_stock[$okey] - $qty[$key];
                            $allVval->option_stock = json_encode($db_op_stock);
                            $allVval->save();
                        }
                        $v_total += $value->price;
                    }
                } else {
                    foreach ($cart as $id => $proId) {
                        $product = UserItem::findOrFail($proId['id']);
                        if ($product->id == $item->id && $product->type == 'physical') {
                            $stock = $product->stock - $proId['qty'];
                            $product->stock = $stock;
                            $product->save();
                        }
                    }
                }
            }
            UserOrderItem::insert([
                'user_order_id' => $orderId,
                'customer_id' => Auth::guard('customer')->user()->id,
                'item_id' => $item->id,
                'title' => $itemcontent->title ?? '',
                'sku' => $item->sku,
                'qty' => $qty[$key],
                'variations' => $variations[$key],
                'category' => $itemcontent->category_id,
                'price' =>  $variations[$key] ? $total[$key] - $v_total * $qty[$key] : $product_price[$key] * $qty[$key],
                'previous_price' => $item->previous_price,
                'image' => $item->thumbnail,
                'summary' => $itemcontent->summary ?? '',
                'description' => $itemcontent->description ?? '',
                'created_at' => Carbon::now()
            ]);
        }
    }

    public function sendMails($order)
    {
        if (Session::has('user_midtrans')) {
            $user = Session::get('user_midtrans');
        } else {
            $user = getUser();
        }
        if (Session::has('order_details_url')) {
            $order_details_url = Session::get('order_details_url');
            // Dynamic value you want to replace
            $newValue = $order->id;

            // Use regular expression to replace the dynamic value
            $order_details_url = preg_replace('/\/\d+$/', '/' . $newValue, $order_details_url);
        } else {
            $order_details_url = route('customer.orders-details', ['id' => $order->id, getParam()]);
        }

        $data['userBs'] = BasicSetting::where('user_id', $user->id)->first();
        $fileName = \Str::random(4) . time() . '.pdf';
        $path = public_path('assets/front/invoices/' . $fileName);
        $order['tax'] = tax();
        $order['discount'] = Session::get('user_coupon');
        // $var = (array)json_decode($order->orderitems[0]->variations);
        // dd($data['order']->billing_fname);
        UserOrder::where('id', $order->id)->update([
            'invoice_number' => $fileName
        ]);
        $order['invoice_number']  = $fileName;
        $data['order']  = $order;
        $pdf = PDF::setOptions([
            'isHtml5ParserEnabled' => true, 'isRemoteEnabled' => true,
            'logOutputFile' => storage_path('logs/log.htm'),
            'tempDir' => storage_path('logs/')
        ])->loadView('pdf.item', $data)->save($path);
        // Send Mail to Buyer
        $mailer = new MegaMailer;

        $data = [
            'toMail' => $order->billing_email,
            'toName' => $order->billing_fname,
            'attachment' => $fileName,
            'customer_name' => $order->billing_fname,
            'order_number' => $order->order_number,
            'order_link' => !empty($order->customer_id) ? "<strong>Order Details:</strong> <a href='" . $order_details_url . "'>" . $order_details_url . "</a>" : "",
            'website_title' => $data['userBs']->website_title,
            'templateType' => 'product_order',
            'type' => 'productOrder',
            'billing_lname' => $order->billing_lname,
            'billing_address' => $order->billing_address,
            'billing_city' => $order->billing_city,
            'billing_country' => $order->billing_country,
            'billing_number' => $order->billing_number,
            'shpping_fname' => $order->shpping_fname,
            'shpping_lname' => $order->shpping_lname,
            'shpping_address' => $order->shpping_address,
            'shpping_city' => $order->shpping_city,
            'shpping_country' => $order->shpping_country,
            'shpping_number' => $order->shpping_number,
        ];
        $mailer->mailFromTenant($data);
        Session::forget('cart');
        Session::forget('user_coupon');
    }
}
