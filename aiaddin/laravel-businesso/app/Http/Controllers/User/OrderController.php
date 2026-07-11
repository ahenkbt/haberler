<?php

namespace App\Http\Controllers\User;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\User\UserItem;
use App\Models\User\UserOrder;
use App\Models\User\UserOrderItem;
use App\Models\User\UserShopSetting;
use Auth;

class OrderController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }




    public function digitalDownload(Request $request, $itemid = null)
    {
        if ($itemid) {
            $itemId = $itemid;
            $customer = false;
        } else {
            $customer = true;
            $itemId = $request->item_id;
        }
        $item = UserItem::find($itemId);

        if ($customer) {
            $count = UserOrderItem::where('item_id', $itemId)->where('customer_id', Auth::guard('customer')->user()->id)->get();
        } else {
            $count = UserOrderItem::where('item_id', $itemId)->get();
        }
        // if the auth user didn't purchase the item
        if ($count->count() == 0) {
            return back();
        }

        $pathToFile = base_path('core/storage/digital_products/') . $item->download_file;
        if (file_exists($pathToFile)) {
            return response()->download($pathToFile, $item->itemContents[0]->slug . '.zip');
        } else {
            $request->session()->flash('error', "No donwloadable file exists!");
            return back();
        }
    }
}
