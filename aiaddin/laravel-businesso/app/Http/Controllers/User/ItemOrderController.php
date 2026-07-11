<?php

namespace App\Http\Controllers\User;

use Exception;
use Carbon\Carbon;
use App\Models\Customer;
use App\Mail\ContactMail;
use Illuminate\Http\Request;
use App\Models\BasicExtended;
use App\Models\User\UserOrder;
use App\Models\User\BasicSetting;
use PHPMailer\PHPMailer\PHPMailer;
use App\Exports\PorductOrderExport;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Config;
use App\Models\User\UserOfflineGateway;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;


class ItemOrderController extends Controller
{


    public function all(Request $request)
    {
        $search = $request->search;
        $data['orders'] =
            UserOrder::where('user_id', Auth::guard('web')->user()->id)->when($search, function ($query, $search) {
                return $query->where('order_number', $search);
            })
            ->orderBy('id', 'DESC')->paginate(10);
        return view('user.item.order.index', $data);
    }

    public function pending(Request $request)
    {
        $search = $request->search;
        $data['orders'] = UserOrder::where('user_id', Auth::guard('web')->user()->id)->when($search, function ($query, $search) {
            return $query->where('order_number', $search);
        })
            ->where('order_status', 'pending')->orderBy('id', 'DESC')->paginate(10);
        return view('user.item.order.index', $data);
    }

    public function processing(Request $request)
    {
        $search = $request->search;
        $data['orders'] = UserOrder::where('user_id', Auth::guard('web')->user()->id)->where('order_status', 'processing')
            ->when($search, function ($query, $search) {
                return $query->where('order_number', $search);
            })
            ->orderBy('id', 'DESC')->paginate(10);
        return view('user.item.order.index', $data);
    }

    public function completed(Request $request)
    {
        $search = $request->search;
        $data['orders'] = UserOrder::where('user_id', Auth::guard('web')->user()->id)->where('order_status', 'completed')->when($search, function ($query, $search) {
            return $query->where('order_number', $search);
        })
            ->orderBy('id', 'DESC')->paginate(10);
        return view('user.item.order.index', $data);
    }

    public function rejected(Request $request)
    {
        $search = $request->search;
        $data['orders'] = UserOrder::where('user_id', Auth::guard('web')->user()->id)->where('order_status', 'rejected')->when($search, function ($query, $search) {
            return $query->where('order_number', $search);
        })
            ->orderBy('id', 'DESC')->paginate(10);
        return view('user.item.order.index', $data);
    }

    public function status(Request $request)
    {
        $po = UserOrder::find($request->order_id);
        if (($request->order_status != 'rejected') && ($po->payment_status != 'rejected' && $po->order_status != 'rejected')) {
        } elseif ($request->order_status == 'rejected' && $po->payment_status != 'rejected' && $po->order_status != 'rejected') {
            foreach ($po->orderitems as $key => $item) {
                if ($item->variations == 'null' || empty($item->variations)) {
                    // return item quantity 
                    if ($item->item->type == 'physical') {
                        $item->item->stock = $item->item->stock + $item->qty;
                        $item->item->save();
                    }
                } else {
                    $db_op_stock = [];
                    // return variation quantity 
                    $ordered_variations = (array)json_decode($item->variations);
                    foreach ($ordered_variations as $vkey => $vValue) {
                        $db_variation = $item->item->itemVariations()->where('variant_name', $vkey)->first();
                        $db_op_name = json_decode($db_variation->option_name);
                        $db_op_stock = json_decode($db_variation->option_stock);
                        $okey  = array_search($vValue->name, $db_op_name);
                        $db_op_stock[$okey] = $db_op_stock[$okey] + $item->qty;
                        $db_variation->option_stock = json_encode($db_op_stock);
                        $db_variation->save();
                    }
                }
            }
        } elseif (($request->order_status != 'rejected') && ($po->payment_status != 'rejected' && $po->order_status == 'rejected')) {
            foreach ($po->orderitems as $key => $item) {
                if ($item->variations == 'null' || empty($item->variations)) {
                    if ($item->item->type == 'physical') {
                        $item->item->stock = $item->item->stock - $item->qty;
                        $item->item->save();
                    }
                } else {
                    $db_op_stock = [];
                    // stock  variation quantity 
                    $ordered_variations = (array)json_decode($item->variations);
                    foreach ($ordered_variations as $vkey => $vValue) {
                        $db_variation = $item->item->itemVariations()->where('variant_name', $vkey)->first();
                        $db_op_name = json_decode($db_variation->option_name);
                        $db_op_stock = json_decode($db_variation->option_stock);
                        $okey  = array_search($vValue->name, $db_op_name);
                        $db_op_stock[$okey] = $db_op_stock[$okey] - $item->qty;
                        $db_variation->option_stock = json_encode($db_op_stock);
                        $db_variation->save();
                    }
                }
            }
        } 
        $ubs= BasicSetting::where('user_id',Auth::user()->id)->first();
        $po->order_status = $request->order_status;
        $po->save();
        $user = Customer::findOrFail($po->customer_id);
        $be = BasicExtended::first();
        $sub = 'Order Status Update';
        // Send Mail to Buyer
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

                //Recipients
                $mail->setFrom($be->from_mail, $ubs->from_name);
                $mail->addAddress($user->email, $user->fname);
                $mail->addReplyTo($ubs->email, $ubs->from_name);
                // Content
                $mail->isHTML(true);
                $mail->Subject = $sub;
                $mail->Body    = 'Hello <strong>' . $user->username . '</strong>,<br/><br/>
                Your order is ' . $request->order_status . '<br/> 
                Order Number:' . $po->order_number . '.<br/> 
                Order details: <a href="' . route('customer.orders-details', ['id' => $po->id, Auth::guard('web')->user()->username]) . '">' . route('customer.orders-details', ['id' => $po->id, Auth::guard('web')->user()->username]) . '</a> <br/><br/>
                Thank you.';
                $mail->send();
            } catch (Exception $e) {
                // die($e->getMessage());
            }
        } else {
            try {
                //Recipients
                $mail->setFrom($be->from_mail, $be->from_name);
                $mail->addAddress($user->email, $user->fname);
                // Content
                $mail->isHTML(true);
                $mail->Subject = $sub;
                $mail->Body    = 'Hello <strong>' . $user->username . '</strong>,<br/><br/>
                Your order is ' . $request->order_status . '.<br/> 
                Order Number: ' . $po->order_number . '.<br/> 
                Order details: <a href="' . route('customer.orders-details', ['id' => $po->id, Auth::guard('web')->user()->username]) . '">' . route('customer.orders-details', ['id' => $po->id, Auth::guard('web')->user()->username]) . '</a> <br/><br/> 
                Thank you.';
                $mail->send();
            } catch (Exception $e) {
                // die($e->getMessage());
            }
        }
        Session::flash('success', __('Order status changed successfully') . '!');
        return back();
    }

    public function paymentStatus(Request $request)
    {
        $po = UserOrder::find($request->order_id);
        if (($request->payment_status != 'rejected') && ($po->order_status != 'rejected' && $po->payment_status != 'rejected')) {
        } elseif ($request->payment_status == 'rejected' && $po->order_status != 'rejected' && $po->payment_status != 'rejected') {
            foreach ($po->orderitems as $key => $item) {
                if ($item->variations == 'null' || empty($item->variations)) {
                    // return item quantity 
                    if ($item->item->type == 'physical') {
                        $item->item->stock = $item->item->stock + $item->qty;
                        $item->item->save();
                    }
                } else {
                    $db_op_stock = [];
                    // return variation quantity 
                    $ordered_variations = (array)json_decode($item->variations);
                    foreach ($ordered_variations as $vkey => $vValue) {
                        $db_variation = $item->item->itemVariations()->where('variant_name', $vkey)->first();
                        $db_op_name = json_decode($db_variation->option_name);
                        $db_op_stock = json_decode($db_variation->option_stock);
                        $okey  = array_search($vValue->name, $db_op_name);
                        $db_op_stock[$okey] = $db_op_stock[$okey] + $item->qty;
                        $db_variation->option_stock = json_encode($db_op_stock);
                        $db_variation->save();
                    }
                }
            }
        } elseif (($request->payment_status != 'rejected') && ($po->order_status != 'rejected' && $po->payment_status == 'rejected')) {
            foreach ($po->orderitems as $key => $item) {
                if ($item->variations == 'null' || empty($item->variations)) {
                    // return item quantity 
                    if ($item->item->type == 'physical') {
                        $item->item->stock = $item->item->stock - $item->qty;
                        $item->item->save();
                    }
                } else {
                    $db_op_stock = [];
                    // return variation quantity 
                    $ordered_variations = (array)json_decode($item->variations);
                    foreach ($ordered_variations as $vkey => $vValue) {
                        $db_variation = $item->item->itemVariations()->where('variant_name', $vkey)->first();
                        $db_op_name = json_decode($db_variation->option_name);
                        $db_op_stock = json_decode($db_variation->option_stock);
                        $okey  = array_search($vValue->name, $db_op_name);
                        $db_op_stock[$okey] = $db_op_stock[$okey] - $item->qty;
                        $db_variation->option_stock = json_encode($db_op_stock);
                        $db_variation->save();
                    }
                }
            }
        }

        $po->payment_status = $request->payment_status;
        $po->save();

        $user = Customer::findOrFail($po->customer_id);
        $be = BasicExtended::first();
        $ubs = BasicSetting::where('user_id', Auth::user()->id)->first();
        $sub = 'Payment Status Updated';
        // Send Mail to Buyer
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

                //Recipients
                $mail->setFrom($be->from_mail, $ubs->from_name);
                $mail->addAddress($user->email, $user->fname);
                $mail->addReplyTo($ubs->email,$ubs->from_name);
                // Content
                $mail->isHTML(true);
                $mail->Subject = $sub;
                $mail->Body    = 'Hello <strong>' . $user->username . '</strong>,<br/><br/>
                 Your Payment is ' . $request->payment_status . '.<br/> 
                 Order Number: ' . $po->order_number . '.<br/> 
                 Order details : <a href="' . route('customer.orders-details', ['id' => $po->id, Auth::guard('web')->user()->username]) . '">' . route('customer.orders-details', ['id' => $po->id, Auth::guard('web')->user()->username]) . '</a> <br/><br/> 
                 Thank you.';
                $mail->send();
            } catch (Exception $e) {
                // die($e->getMessage());
            }
        } else {
            try {
                //Recipients
                $mail->setFrom($be->from_mail, $be->from_name);
                $mail->addAddress($user->email, $user->fname);
                // Content
                $mail->isHTML(true);
                $mail->Subject = $sub;
                $mail->Body    = 'Hello <strong>' . $user->username . '</strong>,<br/><br/>
                 Your Payment is ' . $request->payment_status . '.<br/> 
                 Order Number: ' . $po->order_number . '.<br/> 
                 Order details: <a href="' . route('customer.orders-details', ['id' => $po->id, Auth::guard('web')->user()->username]) . '">' . route('customer.orders-details', ['id' => $po->id, Auth::guard('web')->user()->username]) . '</a> <br/><br/> 
                 Thank you.';
                $mail->send();
            } catch (Exception $e) {
                // die($e->getMessage());
            }
        }

        Session::flash('success', __('Payment status changed successfully') . '!');
        return back();
    }

    public function mail(Request $request)
    {
        $rules = [
            'email' => 'required',
            'subject' => 'required',
            'message' => 'required'
        ];
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $be = BasicExtended::first();
        $from = $be->from_mail;
        $sub = $request->subject;
        $msg = $request->message;
        $to = $request->email;
        // Mail::to($to)->send(new ContactMail($from, $sub, $msg));
        // Send Mail
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
                //Recipients
                $mail->setFrom($from);
                $mail->addAddress($to);
                // Content
                $mail->isHTML(true);
                $mail->Subject = $sub;
                $mail->Body    = $msg;

                $mail->send();
            } catch (Exception $e) {
            }
        } else {
            try {
                //Recipients
                $mail->setFrom($from);
                $mail->addAddress($to);
                // Content
                $mail->isHTML(true);
                $mail->Subject = $sub;
                $mail->Body    = $msg;
                $mail->send();
            } catch (Exception $e) {
            }
        }

        Session::flash('success', __('Mail sent successfully!'));
        return "success";
    }

    public function details($id)
    {
        $order = UserOrder::findOrFail($id);
        return view('user.item.order.details', compact('order'));
    }


    public function bulkOrderDelete(Request $request)
    {
        $ids = $request->ids;

        foreach ($ids as $id) {
            $order = UserOrder::findOrFail($id);
            @unlink(public_path('assets/front/invoices/' . $order->invoice_number));
            @unlink(public_path('assets/front/receipt/' . $order->receipt));
            foreach ($order->orderitems as $item) {
                $item->delete();
            }
            $order->delete();
        }

        Session::flash('success', __('Orders deleted successfully') . '!');
        return "success";
    }

    public function orderDelete(Request $request)
    {
        $order = UserOrder::findOrFail($request->order_id);
        @unlink(public_path('assets/front/invoices/' . $order->invoice_number));
        @unlink(public_path('assets/front/receipt/' . $order->receipt));
        foreach ($order->orderitems as $item) {
            $item->delete();
        }
        $order->delete();

        Session::flash('success', __('Item order deleted successfully') .'!');
        return back();
    }

    public function report(Request $request)
    {

        $bs = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->first();
        Config::set('app.timezone', $bs->timezoneinfo->timezone);
        $fromDate = $request->from_date;
        $toDate = $request->to_date;
        $paymentStatus = $request->payment_status;
        $orderStatus = $request->order_status;
        $paymentMethod = $request->payment_method;

        if (!empty($fromDate) && !empty($toDate)) {
            $orders = UserOrder::where('user_id', Auth::guard('web')->user()->id)
                ->when($fromDate, function ($query, $fromDate) {
                    return $query->whereDate('created_at', '>=', Carbon::parse($fromDate));
                })->when($toDate, function ($query, $toDate) {
                    return $query->whereDate('created_at', '<=', Carbon::parse($toDate));
                })->when($paymentMethod, function ($query, $paymentMethod) {
                    return $query->where('method', $paymentMethod);
                })->when($paymentStatus, function ($query, $paymentStatus) {
                    return $query->where('payment_status', $paymentStatus);
                })->when($orderStatus, function ($query, $orderStatus) {
                    return $query->where('order_status', $orderStatus);
                })->select('order_number', 'billing_fname', 'billing_email', 'billing_number', 'billing_city', 'billing_country', 'shpping_fname', 'shpping_email', 'shpping_number', 'shpping_city', 'shpping_country', 'method', 'shipping_method', 'cart_total', 'discount', 'tax', 'shipping_charge', 'total', 'created_at', 'payment_status', 'order_status')
                ->orderBy('id', 'DESC');

            Session::put('item_orders_report', $orders->get());
            $data['orders'] = $orders->paginate(10);
        } else {
            Session::put('item_orders_report', []);
            $data['orders'] = [];
        }

        $data['onPms'] = UserPaymentGeteway::where('user_id', Auth::guard('web')->user()->id)->where('status', 1)->get();
        $data['offPms'] = UserOfflineGateway::where('user_id', Auth::guard('web')->user()->id)->where('item_checkout_status', 1)->get();


        return view('user.item.order.report', $data);
    }

    public function exportReport()
    {
        $orders = Session::get('item_orders_report');
        if (empty($orders) || count($orders) == 0) {
            Session::flash('warning', __('There are no orders to export') . '.');
            return back();
        }
        return Excel::download(new PorductOrderExport($orders), 'product-orders.csv');
    }
}
