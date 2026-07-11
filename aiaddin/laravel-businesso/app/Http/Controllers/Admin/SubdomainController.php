<?php

namespace App\Http\Controllers\Admin;

use Carbon\Carbon;
use App\Models\User;
use Illuminate\Http\Request;
use App\Models\User\BasicSetting;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Config;

class SubdomainController extends Controller
{

    public function __construct()
    {
        $abs = BasicSetting::first();
        Config::set('app.timezone', $abs->timezone);
    }

    public function index(Request $request)
    {

        $users = User::all();
        $userIds = [];
        foreach ($users as $key => $user) {
            if (cPackageHasSubdomain($user)) {
                $userIds[] = $user->id;
            }
        }

        $type = $request->type;
        $username = $request->username;
        $subdomains = User::whereHas('memberships', function ($q) {
            $q->where('status', '=', 1)
                ->where('start_date', '<=', Carbon::now()->format('Y-m-d'))
                ->where('expire_date', '>=', Carbon::now()->format('Y-m-d'));
        })->when($type, function ($query, $type) {
            if ($type == 'pending') {
                return $query->where('subdomain_status', 0);
            } elseif ($type == 'connected') {
                return $query->where('subdomain_status', 1);
            }
        })->when($username, function ($query, $username) {
            return $query->where('username', 'LIKE', '%' . $username . '%');
        })->when(!empty($userIds), function ($query) use ($userIds) {
            return $query->whereIn('id', $userIds);
        })->latest()->paginate(10);
        $data['subdomains'] = $subdomains;

        return view('admin.subdomains.index', $data);
    }

    public function status(Request $request)
    {
        $user = User::findOrFail($request->user_id);
        $user->subdomain_status = $request->status;
        $user->save();

        $request->session()->flash('success', __('Status updated successfully'));
        return back();
    }
}
