<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BasicSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use DB;

class AdvertisementController extends Controller
{
    public function index(){
        $data['data'] = BasicSetting::select('adsense_publisher_id')->first();
        return view('admin.advertisement.index',$data);
    }
    public function update(Request $request){
        $request->validate([
            'adsense_publisher_id' => 'required'
        ]);
        DB::table('basic_settings')->update(['adsense_publisher_id' => $request->adsense_publisher_id]);
        $request->session()->flash('success', __('Settings updated successfully!'));
        return back();
    }
}
