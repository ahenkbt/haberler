<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\User\CounterInformation;
use App\Models\User\Language;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Validator;

class CounterInformationController extends Controller
{
    public function index(Request $request)
    {
        $lang = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->firstorFail();

        $data['counterInformations'] = CounterInformation::where([
            ['language_id', '=', $lang->id],
            ['user_id', '=', Auth::id()],
        ])
            ->orderBy('id', 'DESC')
            ->get();
        return view('user.counter-information.index', $data);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return
     */
    public function store(Request $request)
    {

        $rules = [
            'user_language_id' => 'required',
            'title' => 'required|max:255',
            'count' => 'required|integer',
            'serial_number' => 'required|integer'
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $input = $request->all();
        $input['language_id'] = $request->user_language_id;
        $input['user_id'] = Auth::id();

        $counterInformation = new CounterInformation;
        $counterInformation->create($input);
        Session::flash('success', __('Counter Information added successfully') . '!');
        return "success";
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return
     */
    public function edit($id)
    {
        $data['counterInformation'] = CounterInformation::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail();
        return view('user.counter-information.edit', $data);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     *
     */
    public function update(Request $request)
    {
        $rules = [
            'title' => 'required|max:255',
            'count' => 'required|integer',
            'serial_number' => 'required|integer'
        ];
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $input = $request->all();
        $counterInformation = CounterInformation::where('user_id', Auth::user()->id)->where('id', $request->counter_information_id)->firstOrFail();
        $slug = make_slug($request->title);
        $input['slug'] = $slug;
        $input['user_id'] = Auth::id();
        $input['icon'] = $request->icon === null ? $counterInformation->icon : $request->icon;
        $counterInformation->update($input);
        Session::flash('success', __('Counter Information updated successfully') . '!');
        return "success";
    }

    public function delete(Request $request)
    {
        CounterInformation::where('user_id', Auth::user()->id)->where('id', $request->counter_information_id)->firstOrFail()->delete();
        Session::flash('success', __('Counter Information deleted successfully') . '!');
        return back();
    }
    public function bulkDelete(Request $request)
    {
        $ids = $request->ids;
        foreach ($ids as $id) {
            CounterInformation::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail()->delete();
        }
        Session::flash('success', __('Counter Information bulk-deleted successfully') . '!');
        return "success";
    }
}
