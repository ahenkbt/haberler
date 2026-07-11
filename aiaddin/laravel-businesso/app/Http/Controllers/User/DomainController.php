<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\BasicExtended;
use App\Models\User\UserCustomDomain;
use Auth;
use Illuminate\Http\Request;
use Session;

class DomainController extends Controller
{
    public function domains()
    {
        $rcDomain = UserCustomDomain::where('status', '<>', 2)->where('user_id', Auth::user()->id)->orderBy('id', 'DESC')->first();
        $data['rcDomain'] = $rcDomain;
        return view('user.domains', $data);
    }


    public function domainrequest(Request $request)
    {
        $be = BasicExtended::select('domain_request_success_message', 'cname_record_section_title')->first();

        $rules = [
            'custom_domain' => [
                'required',
                function ($attribute, $value, $fail) use ($be) {
                    // if user request the current domain
                    if (getCdomain(Auth::user()) == $value) {
                        $fail(__('You cannot request your current domain') . '.');
                    }
                }
            ]
        ];

        $request->validate($rules);

        $cdomain = new UserCustomDomain;
        $cdomain->user_id = Auth::user()->id;
        $cdomain->requested_domain = $request->custom_domain;
        $cdomain->current_domain = getCdomain(Auth::user());
        $cdomain->status = 0;
        $cdomain->save();

        $request->session()->flash('domain-success', $be->domain_request_success_message);
        return back();
    }
}
