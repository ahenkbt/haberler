<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\User\JobExperience;
use App\Models\User\Language;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Validator;
use Mews\Purifier\Facades\Purifier;

class JobExperienceController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return
     */
    public function index(Request $request)
    {
        if ($request->has('language')) {
            $lang = Language::where([
                ['code', $request->language],
                ['user_id', Auth::id()]
            ])->first();
        } else {
            $lang = Language::where([
                ['dashboard_default', 1],
                ['user_id', Auth::id()]
            ])->first();
        }

        $data['job_experiences'] = JobExperience::where([
            ['language_id', '=', $lang->id],
            ['user_id', '=', Auth::id()],
        ])
            ->orderBy('id', 'DESC')
            ->get();
        return view('user.job_experience.index', $data);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        $rules = [
            'user_language_id' => 'required',
            'company_name' => 'required',
            'designation' => 'required',
            'start_date' => 'required',
            'serial_number' => 'required',
        ];
        if (!array_key_exists('is_continue', $request->all())) {
            $rules['end_date'] = 'required';
            $request['is_continue'] = 0;
        }
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $newJobExperience = new JobExperience();
        $newJobExperience->company_name = $request->company_name;
        $newJobExperience->designation = $request->designation;
        $newJobExperience->content = Purifier::clean($request->content);
        $newJobExperience->start_date = $request->start_date;
        $newJobExperience->end_date = $request->is_continue === "1"
            ? null : $request->end_date;
        $newJobExperience->is_continue = $request->is_continue;
        $newJobExperience->serial_number = $request->serial_number;
        $newJobExperience->language_id = $request->user_language_id;
        $newJobExperience->user_id = Auth::id();
        $newJobExperience->save();
        Session::flash('success', __('Job experience added successfully') . '!');
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
        $data['jobExperience'] = JobExperience::query()->where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail();
        return view('user.job_experience.edit', $data);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return
     */
    public function update(Request $request)
    {
        $rules = [
            'company_name' => 'required',
            'designation' => 'required',
            'start_date' => 'required',
            'serial_number' => 'required',
        ];
        if (!array_key_exists('is_continue', $request->all())) {
            $rules['end_date'] = 'required';
        }

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        $newJobExperience = JobExperience::query()->findOrFail($request->id);
        if ($newJobExperience->user_id != Auth::user()->id) {
            return;
        }
        $newJobExperience->company_name = $request->company_name;
        $newJobExperience->designation = $request->designation;
        $newJobExperience->content = Purifier::clean($request->content);
        $newJobExperience->start_date = $request->start_date;
        $newJobExperience->end_date = $request->is_continue === "on" ? null : $request->end_date;
        $newJobExperience->is_continue = $request->is_continue === "on" ? 1 : 0;
        $newJobExperience->serial_number = $request->serial_number;
        $newJobExperience->user_id = Auth::id();
        $newJobExperience->save();
        Session::flash('success', __('Job experience updated successfully') . '!');
        return "success";
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        //
    }

    public function delete(Request $request)
    {
        JobExperience::where('user_id', Auth::user()->id)->where('id', $request->id)->firstOrFail()->delete();
        Session::flash('success', __('Job experience deleted successfully') . '!');
        return back();
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->ids;
        foreach ($ids as $id) {
            JobExperience::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail()->delete();
        }
        Session::flash('success', __('Job experience deleted successfully') . '!');
        return "success";
    }
}
