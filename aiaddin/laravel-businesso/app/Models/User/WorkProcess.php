<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Model;

class WorkProcess extends Model
{
    public $table = "user_work_processes";

    protected $fillable = [
        'icon',
        'title',
        'text',
        'serial_number',
        'user_id',
        'language_id',
    ];

    public function language()
    {
        return $this->belongsTo(Language::class, 'language_id');
    }
}
