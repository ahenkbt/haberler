<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserCustomDomain extends Model
{
    use HasFactory;

    protected $table = 'user_custom_domains';

    public function user() {
        return $this->belongsTo('App\Models\User');
    }
}
