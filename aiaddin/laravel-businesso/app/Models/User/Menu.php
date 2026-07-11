<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Menu extends Model
{
    use HasFactory;
    public $table = "user_menus";
    protected $guarded = [];
    public function user()
    {
        return $this->belongsTo('App\Models\User', 'user_id');
    }
}
