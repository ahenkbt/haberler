<?php

namespace App\Models\User;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Page extends Model
{
    use HasFactory;

    protected $table = 'user_pages';

    public function language() {
        return $this->belongsTo(Language::class);
    }

    public function user() {
        return $this->belongsTo(User::class);
    }
}
