<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\User\BasicSetting;
use Auth;
use Illuminate\Http\Request;
use Session;

class CssController extends Controller
{
    public function index() {
        $data = BasicSetting::where('user_id', Auth::user()->id)->select('custom_css');
        if ($data->count() == 0) {
            $data = new BasicSetting;
            $data->user_id = Auth::user()->id;
            $data->save();
        } else {
            $data = $data->firstOrFail();
        }
        $data['data'] = $data;
        return view('user.settings.css', $data);
    }

    public function update(Request $request) {
        $css = clean($request->custom_css);
        $data = BasicSetting::where('user_id', Auth::user()->id)->firstOrFail();
        $data->custom_css = $css;
        $data->save();

        Session::flash('success', __('Custom CSS updated successfully') . '!');
        return back();
    }
}
